import { HttpStatusCode } from "axios";
import httpErrorLib from "http-errors";

export function createHttpError(status: HttpStatusCode, message?: object | string) {
  return httpErrorLib(status, { message });
}
