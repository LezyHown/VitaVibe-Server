import { Schema, Types, model } from "mongoose";

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: Types.ObjectId, ref: 'User', required: true },
  products: [{ type: Types.ObjectId, required: true }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
  },
  orderDate: { type: Date, default: Date.now },
});

export default model("Order", orderSchema);