import { Users, Applications, BirthCertificates } from "../db/schemas";
import { db } from "../config/db";
import { and, eq, ne } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../errors/errors";
import applicationStatistics from "../utils/ApplicationStats";
import Hashing from "../utils/Hashing";
import { TUpdateProfilePayload } from "../types/types";

class ProfileServices {
  static async getProfile(id: string) {
    const [user] = await db
      .select({
        id: Users.id,
        userId: Users.userId,
        firstName: BirthCertificates.firstName,
        surname: BirthCertificates.surname,
        nationalIdNumber: Users.nationalIdNumber,
        phoneNumber: Users.phoneNumber,
        email: Users.email,
        role: Users.role,
        isEmailVerified: Users.isEmailVerified,
        status: Users.status,
        createdAt: Users.createdAt,
      })
      .from(Users)
      .where(eq(Users.id, id))
      .innerJoin(
        BirthCertificates,
        eq(BirthCertificates.nationalIdNumber, Users.nationalIdNumber),
      )
      .limit(1);

    if (!user) {
      throw new NotFoundError("Profile doesn't exist");
    }

    const applications = await db
      .select({
        id: Applications.id,
        trackingId: Applications.trackingId,
        status: Applications.status,
        isPrinted: Applications.isPrinted,
        createdAt: Applications.createdAt,
      })
      .from(Applications)
      .where(eq(Applications.user, user.id));

    const { stats } = applicationStatistics(applications);

    return {
      profile: {
        ...user,
        applications,
        applicationsStats: stats,
      },
    };
  }

  static async updateProfile(id: string, payload: TUpdateProfilePayload) {
    const [user] = await db
      .select({
        id: Users.id,
        email: Users.email,
        password: Users.password,
        isEmailVerified: Users.isEmailVerified,
      })
      .from(Users)
      .where(eq(Users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundError("Profile doesn't exist");
    }

    let updateData = { ...payload, isEmailVerified: user.isEmailVerified };

    if (payload.password) {
      const isCurrentPassword = await Hashing.verifyPassword(
        payload.password,
        user.password,
      );
      if (isCurrentPassword) {
        throw new BadRequestError("Can not use current password");
      }

      const hashedPassword = await Hashing.hashPassword(payload.password);
      updateData.password = hashedPassword;
    }

    if (payload.email && payload.email !== user.email) {
      const [isEmailAvailable] = await db
        .select({
          id: Users.id,
          email: Users.email,
        })
        .from(Users)
        .where(and(eq(Users.email, payload.email), ne(Users.id, id)))
        .limit(1);
      if (isEmailAvailable) {
        throw new BadRequestError("Email already exists");
      }

      updateData = {
        ...updateData,
        email: payload.email,
        isEmailVerified: false,
      };
    } else {
      delete updateData.email;
    }

    const [updatedProfile] = await db
      .update(Users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, user.id))
      .returning({
        id: Users.id,
        userId: Users.userId,
        phoneNumber: Users.phoneNumber,
        email: Users.email,
        role: Users.role,
        status: Users.status,
      });

    return {
      profile: updatedProfile,
    };
  }
}

export default ProfileServices;
