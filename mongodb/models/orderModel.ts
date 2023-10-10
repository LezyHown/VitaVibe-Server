import { Schema, Types, model } from "mongoose";
import { AddressSchema, InvoiceAddressSchema } from "./userModel";

const product = new Schema(
  {
    variantId: { type: String, required: true },
    productRefId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    sizes: {
      type: [{ 
        size: { type: String, required: true }, 
        quantity: { type: Number, required: true } 
      }],
      required: true,
    },
    image: { type: String, required: true },
  },
  { versionKey: false, _id: false }
);

const orderSchema = new Schema({
  customer: { type: Types.ObjectId, ref: "User", required: true },
  products: { type: [product], required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  invoiceAddress: { type: InvoiceAddressSchema, required: true },
  deliveryAddress: { type: AddressSchema, required: true },
  totalAmount: { type: Number, required: true },
  totalProductCount: { type: Number, required: true },
  deliveryType: { type: String, enum: ["post", "courier"] },
  paymentChargeId: { type: String, required: true },
  orderDate: { type: Date, default: Date.now }
}, { versionKey: false });

export default model("Order", orderSchema);
