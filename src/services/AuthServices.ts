import { or, eq, and } from "drizzle-orm";
import { db } from "../config/db";
import {
  BirthCertificates,
  Roles,
  StaffMembers,
  UserRoles,
  Users,
} from "../db/schemas";
import {
  TAppRedisKeys,
  TLoginUserPayload,
  TRegisterUserPayload,
} from "../types/types";
import GenerateIds from "../utils/GenerateID";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors";
import Hashing from "../utils/Hashing";
import logger from "./LoggerService";
import Tokens from "./Tokens";
import { getUserWithPermissions } from "../utils/GetUserPermissions";
import {
  deleteRedisRefreshToken,
  getRedisRefreshToken,
  setRedisRefreshToken,
} from "../utils/RefreshToken";
import { generateAndSaveTokens } from "../utils/LoginTokensHelper";
import { generateOtp, hasPendingOtp, validateOtp } from "./OTPService";
import messageQueue from "../queues/messageQueue";

class AuthServices {
  static async registerUser(payload: TRegisterUserPayload) {
    const {
      nationalIdNumber,
      phoneNumber,
      email,
      password,
      confirmPassword,
      firstName,
      surname,
    } = payload;

    if (password !== confirmPassword) {
      throw new BadRequestError("Passwords don't match");
    }

    const [isBirthAvailable] = await db
      .select({
        id: BirthCertificates.id,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
      })
      .from(BirthCertificates)
      .where(eq(BirthCertificates.nationalIdNumber, nationalIdNumber))
      .limit(1);

    if (!isBirthAvailable) {
      throw new NotFoundError("Birth certificate not registered");
    }

    if (
      isBirthAvailable.firstName !== firstName ||
      isBirthAvailable.surname !== surname
    ) {
      throw new BadRequestError("Invalid user registration details");
    }

    const [user] = await db
      .select({
        id: Users.id,
      })
      .from(Users)
      .where(
        or(
          eq(Users.nationalIdNumber, nationalIdNumber),
          eq(Users.phoneNumber, phoneNumber),
          eq(Users.email, email),
        ),
      )
      .limit(1);

    if (user) {
      throw new BadRequestError("User already exists");
    }

    const userId = await GenerateIds.UserID(TAppRedisKeys.userIdSequence);

    const hashedPassword = await Hashing.hashPassword(password);

    const newUserTransaction = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(Users)
        .values({
          userId,
          nationalIdNumber,
          phoneNumber,
          email,
          password: hashedPassword,
        })
        .returning({
          id: Users.id,
          userId: Users.userId,
          nationalIdNumber: Users.nationalIdNumber,
          email: Users.email,
          phoneNumber: Users.phoneNumber,
          status: Users.status,
          createdAt: Users.createdAt,
        });

      if (!newUser) {
        throw new BadRequestError("Invalid user details");
      }

      const [role] = await tx
        .select()
        .from(Roles)
        .where(eq(Roles.name, "citizen"))
        .limit(1);
      if (!role) {
        throw new NotFoundError("Role citizen doesn't exits");
      }

      await tx
        .insert(UserRoles)
        .values({ userId: newUser?.id, roleId: role.id });

      return { newUser };
    });

    const { newUser } = newUserTransaction;

    logger.info(
      `[ USER REGISTRATION ] - User ID: ${newUser && newUser.id} was registered successfully`,
    );

    if (!newUser) {
      throw new BadRequestError("Invalid registration details");
    }

    const userRoles = await getUserWithPermissions(newUser.email);

    const { accessToken, refreshToken } = await Tokens.generateTokens({
      id: newUser.id,
      userId: newUser.userId,
      roles: userRoles?.roles as string[],
      permissions: userRoles?.permissions as string[],
      email: newUser.email,
      platform: payload.platform,
    });

    await setRedisRefreshToken(
      newUser.id,
      TAppRedisKeys.refreshToken,
      refreshToken,
    );

    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  static async loginUser(payload: TLoginUserPayload) {
    const user = await getUserWithPermissions(payload.email);
    const platform = payload.platform;

    if (!user) {
      throw new BadRequestError("Bad credentials");
    }

    const { hashedPassword, ...safeUser } = user;

    if (platform === "registrar-portal") {
      if (user.roles.includes("super_admin")) {
        const { accessToken, refreshToken } = await generateAndSaveTokens({
          safeUser,
          platform,
          password: payload.password,
          hashedPassword: user.hashedPassword,
        });

        return {
          user: safeUser,
          accessToken,
          refreshToken,
          platform,
        };
      }
      const [isStaffMember] = await db
        .select({
          staffId: StaffMembers.staffId,
          station: StaffMembers.station,
        })
        .from(StaffMembers)
        .where(
          and(
            eq(StaffMembers.nationalIdNumber, user.nationalIdNumber),
            eq(StaffMembers.status, "ACTIVE"),
          ),
        )
        .limit(1);

      if (!isStaffMember) {
        throw new UnauthorizedError(
          "Unauthorized: You do not have administrator permissions to access this portal",
        );
      }

      const { accessToken, refreshToken } = await generateAndSaveTokens({
        safeUser: {
          ...safeUser,
          ...isStaffMember,
        },
        platform,
        password: payload.password,
        hashedPassword: user.hashedPassword,
      });

      return {
        user: {
          ...safeUser,
          ...isStaffMember,
        },
        accessToken,
        refreshToken,
        platform,
      };
    }

    const { accessToken, refreshToken } = await generateAndSaveTokens({
      safeUser,
      platform,
      password: payload.password,
      hashedPassword: user.hashedPassword,
    });

    return {
      user: safeUser,
      accessToken,
      refreshToken,
      platform,
    };
  }

  private static async getUserByPhoneNumber(phoneNumber: string) {
    const [user] = await db
      .select({
        id: Users.id,
        nationalIdNumber: Users.nationalIdNumber,
        email: Users.email,
        phoneNumber: Users.phoneNumber,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        status: Users.status,
        createdAt: Users.createdAt,
        isPhoneNumberVerified: Users.isPhoneNumberVerified,
      })
      .from(Users)
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
      )
      .where(eq(Users.phoneNumber, phoneNumber))
      .limit(1);
    return user ?? null;
  }

  static async requestPhoneNumberVerification(payload: {
    phoneNumber: string;
  }) {
    const { phoneNumber } = payload;

    const user = await AuthServices.getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.isPhoneNumberVerified) {
      throw new BadRequestError("Phone number already verified");
    }

    const hasPending = await hasPendingOtp({
      userId: user.id,
      type: "verification",
      baseKey: TAppRedisKeys.verificationOTP,
    });

    if (hasPending) {
      throw new BadRequestError(
        "An OTP has already been sent. Please wait before requesting a new one.",
      );
    }

    const otp = await generateOtp({
      userId: user.id,
      type: "verification",
      baseKey: TAppRedisKeys.verificationOTP,
    });

    await messageQueue.queue.add("whatsappMessage", {
      recipientNumber: user.phoneNumber,
      username: `${user.firstName} ${user.surname}`,
      code: otp,
      type: "verification",
    });

    return {
      message: "OTP sent successfully",
    };
  }

  static async verifyPhoneNumber(payload: {
    phoneNumber: string;
    otp: string;
  }) {
    const { otp, phoneNumber } = payload;

    const user = await AuthServices.getUserByPhoneNumber(phoneNumber);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.isPhoneNumberVerified) {
      throw new BadRequestError("Phone number already verified");
    }

    await validateOtp({
      enteredOtp: otp,
      userId: user.id,
      type: "verification",
      baseKey: TAppRedisKeys.verificationOTP,
    });

    await db
      .update(Users)
      .set({
        isPhoneNumberVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, user.id));

    return {
      message: "Phone number verified successfully",
    };
  }

  static async logoutUser(userId: string) {
    await deleteRedisRefreshToken(userId, TAppRedisKeys.refreshToken);
  }

  static async refreshToken(userId: string, currentRefreshToken: string) {
    const redisRefreshToken = await getRedisRefreshToken(
      userId,
      TAppRedisKeys.refreshToken,
    );

    if (!redisRefreshToken || redisRefreshToken !== currentRefreshToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const decoded = await Tokens.verifyRefreshToken(currentRefreshToken);

    const { accessToken, refreshToken } = await Tokens.generateTokens({
      ...decoded.payload,
    });

    await setRedisRefreshToken(
      decoded.payload.id,
      TAppRedisKeys.refreshToken,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default AuthServices;
