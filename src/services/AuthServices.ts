import { or, eq } from "drizzle-orm";
import { db } from "../config/db";
import { BirthCertificates, Users } from "../db/schemas";
import { TRegisterUserPayload } from "../types/types";
import { getUserId } from "../utils/GenerateID";
import { BadRequestError, NotFoundError } from "../errors/errors";
import Hashing from "../utils/Hashing";
import logger from "./LoggerService";

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

    const userId = await getUserId("user:sequence");

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
        phoneNumber: Users.phoneNumber,
        role: Users.role,
        status: Users.status,
        createdAt: Users.createdAt,
      });

    logger.info(
      `[ USER REGISTRATION ] - User ID: ${newUser && newUser.id} was registered successfully`,
    );

    //TODO: Generate Access and Refresh tokens

    return {
      user: newUser,
    };
  }
}

export default AuthServices;
