import { Schema, Types, model } from "mongoose";

const addressSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    homeNumber: { type: String, required: true },
    postCode: { type: Number, required: true },
    addInfo: String,
  },
  { _id: false }
);

const personalInfoSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    birthDate: { type: Date, default: null },
    phoneNumber: { type: String, default: null }
  },
  { _id: false }
);

const activationSchema = new Schema(
  {
    isActivated: { type: Boolean, required: true, default: false },
    otpExpiryMs: { type: Number, required: true, default: 0 },
    secret: {
      key: { type: String, required: true },
      settings: { type: Object, required: true },
    },
  },
  { _id: false }
);

enum InvoiceDeliveryType {
  electronic = "electronic",
  paper = "paper",
}

const userSchema = new Schema(
  {
    personalInfo: { type: personalInfoSchema, required: true },
    addressList: {
      list: { type: [addressSchema], default: [] },
      selected: { type: Number, default: 0 },
    },
    orders: [{ type: Types.ObjectId, ref: "Order" }],
    invoiceDelivery: { type: String, enum: InvoiceDeliveryType, default: InvoiceDeliveryType.electronic },
    newsSubscriber: { type: Types.ObjectId, ref: "NewsSubscriber", required: false, default: null },
    activation: { type: activationSchema, required: true },
  },
  { versionKey: false }
);

export default model("User", userSchema);
