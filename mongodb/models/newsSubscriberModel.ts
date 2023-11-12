import { Schema, model } from "mongoose";

const newsSubscriber = new Schema({
 email: { type: String, unique: true, required: true },
}, { versionKey: false });

newsSubscriber.index({ email: 1 }, { unique: true });

export default model("NewsSubscriber", newsSubscriber);