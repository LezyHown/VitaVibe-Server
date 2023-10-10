import { Schema, model } from "mongoose";

const shippingModel = new Schema({
  // example type: "courier"
  type: String,
  // example cost: 10.99
  cost: Number,
  // example 8% tax: 0.08 
  tax: Number
});

export default model("Shipping", shippingModel);