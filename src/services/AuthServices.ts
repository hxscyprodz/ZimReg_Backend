import { or, eq } from "drizzle-orm";
import { db } from "../config/db";
import { BirthCertificates, Users } from "../db/schemas";
import { TLoginUserPayload, TRegisterUserPayload } from "../types/types";
import GenerateIds from "../utils/GenerateID";
import { BadRequestError, NotFoundError } from "../errors/errors";
import Hashing from "../utils/Hashing";
import logger from "./LoggerService";
import Tokens from "./Tokens";

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

    const userId = await GenerateIds.UserID("user:sequence");

    const hashedPassword = await Hashing.hashPassword(password);

    const [newUser] = await db
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
        role: Users.role,
        status: Users.status,
        createdAt: Users.createdAt,
      });

    logger.info(
      `[ USER REGISTRATION ] - User ID: ${newUser && newUser.id} was registered successfully`,
    );

    if (!newUser) {
      throw new BadRequestError("Invalid registration details");
    }

    const { accessToken, refreshToken } = await Tokens.generateTokens({
      id: newUser.id,
      userId: newUser.userId,
      role: newUser.role,
      email: newUser.email,
    });

    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  static async loginUser(payload: TLoginUserPayload) {
    const [user] = await db
      .select({
        id: Users.id,
        userId: Users.userId,
        email: Users.email,
        hashedPassword: Users.password,
        role: Users.role,
      })
      .from(Users)
      .where(eq(Users.email, payload.email))
      .limit(1);

    if (!user) {
      throw new BadRequestError("Bad credentials");
    }

    const isValidPassword = await Hashing.verifyPassword(
      payload.password,
      user.hashedPassword,
    );
    if (!isValidPassword) {
      throw new BadRequestError("Bad credentials");
    }

    const { hashedPassword, ...safeUser } = user;

    const { accessToken, refreshToken } = await Tokens.generateTokens(safeUser);

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }
}

export default AuthServices;
