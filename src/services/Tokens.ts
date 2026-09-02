import { SignJWT, jwtVerify } from "jose";
import { config } from "../config/envConfig";

interface ITokenPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
}

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  config.ACCESS_TOKEN_SECRET,
);

const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  config.REFRESH_TOKEN_SECRET,
);

class Tokens {
  static async generateTokens(payload: ITokenPayload) {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }
  static generateAccessToken(payload: ITokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(ACCESS_TOKEN_SECRET);
  }

  static generateRefreshToken(payload: ITokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(REFRESH_TOKEN_SECRET);
  }

  static async verifyAccessToken(accessToken: string) {
    return await jwtVerify(accessToken, ACCESS_TOKEN_SECRET);
  }

  static async verifyRefreshToken(refreshToken: string) {
    return await jwtVerify(refreshToken, REFRESH_TOKEN_SECRET);
  }
}

export default Tokens;
