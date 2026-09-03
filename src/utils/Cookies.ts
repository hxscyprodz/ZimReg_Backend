import { Response } from "express";
import { config } from "../config/envConfig";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict" as const,
};

class Cookies {
  static setCookies = (
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) => {
    res.cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: config.ACCESS_TOKEN_TTL,
    });

    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: config.REFRESH_TOKEN_TTL,
    });
  };

  static clearCookies = (res: Response) => {
    const { secure, ...clearOptions } = COOKIE_OPTIONS;

    res.clearCookie("accessToken", clearOptions);
    res.clearCookie("refreshToken", clearOptions);
  };
}

export default Cookies;
