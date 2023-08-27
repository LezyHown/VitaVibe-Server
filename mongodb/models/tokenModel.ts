import { model, Schema } from "mongoose";
import ms from "ms";

export const ACCESS_EXPIRY_TIME = "20m";
export const REFRESH_EXPIRY_TIME = "30d";

const TokenSchema = new Schema(
  {
    refreshToken: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expireAt: { type: Date, required: true, default: () => Date.now() + ms(REFRESH_EXPIRY_TIME) },
  },
  { versionKey: false }
);
// Для автоудаления по полю expiresAt
TokenSchema.index({ "expireAt": 1 }, { expireAfterSeconds: 0 });

export default model("Token", TokenSchema);