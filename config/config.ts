import { Request } from "express";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import ms from "ms";

export function createRequestLimiter(time: string, limit: number, messageDetails?: string) {
  return rateLimit({
    windowMs: ms(time),
    max: limit,
    message: { message: messageDetails ?? `max ${limit} requests per ${time}`, success: false },
    keyGenerator: (req: Request) => req.ip,
  })
}

export default { PORT: process.env.PORT, ms };