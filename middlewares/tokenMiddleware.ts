import { HttpStatusCode } from "axios";
import { NextFunction, Request, Response } from "express";
import { createHttpError } from "../services/httpErrorService";
import tokenService from "../services/tokenService";

type TokenType = "ACCESS_TOKEN" | "REFRESH_TOKEN";

function getAuthorizationAccess(authorization: string | undefined): string | null {
  const [method, value] = String(authorization).split(" ");

  return method === "Bearer" ? value : null;
}

/**
 * Получает данные из токена и передает в Body, как поле payload.
 * - Любой токен может быть устаревшим.
 * - Рекомендуется делать обновление с клиента.
 *  @param tokenType Тип токена
 *  @param skipError Пропуск к следующему middleware при ошибке
 */
export function tokenMiddleware(tokenType: TokenType, skipError?: boolean) {
  return async function payloadToBody(req: Request, res: Response, next: NextFunction) {
    const { REFRESH_TOKEN } = req.cookies;
    const isAccessTokenType = tokenType === "ACCESS_TOKEN";
    const accessToken = getAuthorizationAccess(req.headers.authorization);

    const token = isAccessTokenType ? accessToken : REFRESH_TOKEN;
    const secretKey = isAccessTokenType ? "JWT_ACCESS_SECRET" : "JWT_REFRESH_SECRET";

    const payload = tokenService.validateToken(token, secretKey);

    if (!payload && skipError) {
      next();
    } else if (!payload) {
      next(createHttpError(HttpStatusCode.Unauthorized, `Invalid ${tokenType.toLocaleLowerCase()}`));
    } else {
      req.body = { payload };
      next();
    }
  };
}
