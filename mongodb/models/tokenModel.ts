import { model, Schema } from "mongoose";

const TokenSchema = new Schema(
  {
    refreshToken: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { versionKey: false }
);

export default model("Token", TokenSchema);