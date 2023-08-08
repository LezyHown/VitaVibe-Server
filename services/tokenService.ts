import { Response } from "express";
import { Types } from "mongoose";
import "dotenv/config";

import UserDto, { IUserPayload } from "../dtos/userDto";
import jwt from "jsonwebtoken";
import ms from "ms";
import tokenModel from "../mongodb/models/tokenModel";

type TokenType = "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"; 
type TokenSet = { access: string; refresh: string };
const REFRESH_TOKEN_COOKIENAME = "REFRESH_TOKEN";

class TokenService {
  /**
   * Генерирует токены и задаёт refresh в HTTP куки
   */
  public generateTokenSet(res: Response, payload: IUserPayload): TokenSet {
    const refreshExpiry = "30d";
    const tokens = {
      access: jwt.sign(payload, String(process.env.JWT_ACCESS_SECRET), { expiresIn: "20m" }),
      refresh: jwt.sign(payload, String(process.env.JWT_REFRESH_SECRET), { expiresIn: refreshExpiry }),
    };

    res.cookie(REFRESH_TOKEN_COOKIENAME, tokens.refresh, {
      maxAge: ms(refreshExpiry),
      httpOnly: true,
      sameSite: "none",
      secure: false, // 'true' if use HTTPS
    });

    return tokens;
  }

  public async removeRefreshToken(userId: string, res: Response){
    // Убираем токен из token коллекции
    await tokenModel.findOneAndRemove({ "user": new Types.ObjectId(userId) }).exec();
    // Очищаем куки от токена
    res.clearCookie(REFRESH_TOKEN_COOKIENAME);
  }

  public validateToken(token: string, type: TokenType): IUserPayload | null {
    try {
      const jwtPayload = jwt.verify(token, String(process.env[type])) as object;
      const payload = new UserDto(jwtPayload).getPayload();
      
      return payload;
    } 
    catch {
      return null;
    }
  }

  public async saveToken(userId: string, refreshToken: string) {
    const token = await tokenModel.findOne({ user: new Types.ObjectId(userId) });

    if (token) {
      token.refreshToken = refreshToken;
    }
 
    return await (token ?? await tokenModel.create({ user: userId, refreshToken })).save();
  }
}

export default new TokenService();