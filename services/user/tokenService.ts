import { Response } from "express";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import ms from "ms";
import "dotenv/config";

import UserDto, { IUserPayload } from "../../dtos/userDto";
import tokenModel, { ACCESS_EXPIRY_TIME, REFRESH_EXPIRY_TIME } from "../../mongodb/models/tokenModel";
import { createHttpError } from "../httpErrorService";
import { HttpStatusCode } from "axios";

type TokenType = "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET";
type TokenSet = { access: string; refresh: string };
const REFRESH_COOKIENAME = "REFRESH_TOKEN";

class TokenService {
  /**
   * Генерирует токены и задаёт refresh в HTTP куки
   */
  public generateTokenSet(res: Response, payload: IUserPayload): TokenSet {
    const tokens = {
      access: jwt.sign(payload, String(process.env.JWT_ACCESS_SECRET), { expiresIn: ACCESS_EXPIRY_TIME }),
      refresh: jwt.sign(payload, String(process.env.JWT_REFRESH_SECRET), { expiresIn: REFRESH_EXPIRY_TIME }),
    };

    res.cookie(REFRESH_COOKIENAME, tokens.refresh, {
      path: "/",
      maxAge: ms(REFRESH_EXPIRY_TIME),
      httpOnly: true,
      sameSite: "none",
      secure: true
    });

    return tokens;
  }

  public generateAccessToken(payload: IUserPayload, time?: string) {
    return jwt.sign(payload, String(process.env.JWT_ACCESS_SECRET), { expiresIn: time ?? "20m" });
  }

  public async removeRefreshToken(refresh: string, res: Response) {
    const refreshToken = await tokenModel.findOne({ refreshToken: refresh });

    if (!refreshToken) {
      res.clearCookie(REFRESH_COOKIENAME);
      throw createHttpError(HttpStatusCode.Unauthorized, "Need sign-in again");
    }

    // Убираем токен из token коллекции
    await refreshToken.deleteOne();
    res.clearCookie(REFRESH_COOKIENAME);
  }

  public validateToken(token: string, type: TokenType): IUserPayload | null {
    try {
      const jwtPayload = jwt.verify(token, String(process.env[type])) as object;
      const payload = new UserDto(jwtPayload).getPayload();

      return payload;
    } catch {
      return null;
    }
  }

  public async saveToken(userId: string, refreshToken: string) {
    const token = await tokenModel.findOne({ user: new Types.ObjectId(userId) });

    if (token) {
      token.refreshToken = refreshToken;
    }

    return await (token ?? (await tokenModel.create({ user: userId, refreshToken }))).save();
  }
}

export default new TokenService();
