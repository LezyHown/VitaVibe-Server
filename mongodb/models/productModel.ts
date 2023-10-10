import { Schema, model } from "mongoose";

const ImgVariants = new Schema(
  {
    thumbnail: { type: String, required: true },
    original: { type: String, required: true },
  },
  { _id: false }
);

const SizeVariants = new Schema(
  {
    size: { type: String, required: true },
    count: { type: Number, required: true },
  },
  { _id: false }
);

const availableProductSchema = new Schema(
  {
    available: { type: Boolean, required: true },
    details: String,
  },
  { _id: false }
);

const ProductVariant = new Schema({
  images: [ImgVariants],
  name: { type: String, required: true },
  subTitle: { type: String, required: true },
  advantages: [String],
  price: { type: Number, required: true },
  oldPrice: Number,
  currency: { type: String, enum: ["USD"], default: "USD" },
  description: String,
  sizeSummary: { type: [String], required: false },
  sizes: [SizeVariants] || [],
  color: String,
  details: [String] || [],
  gender: { type: String, enum: ["male", "female", null], default: null },
  available: { type: availableProductSchema, required: true },
});

const Product = new Schema(
  {
    variants: [ProductVariant],
  },
  { versionKey: false }
);

ProductVariant.index({
  price: 1,
  name: 1,
  subTitle: 1,
  color: 1,
  gender: 1
});

export default model("Product", Product);
