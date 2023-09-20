import { HttpStatusCode } from "axios";
import httpErrors from "http-errors";

export function createHttpError(status: HttpStatusCode, message?: object | string) {
  console.log(message);
  return httpErrors(status, { message: message });
}
