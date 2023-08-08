import { Schema, model } from "mongoose";

const newsSubscriber = new Schema({
 email: String
}, { versionKey: false });

export default model("NewsSubscriber", newsSubscriber);