import Joi from "joi";
import { Cart, CartProduct } from "./types";

const cartProductSchema = Joi.object<CartProduct>({
  color: Joi.string().required(),
  _id: Joi.string().required(),
  name: Joi.string().required(),
  subTitle: Joi.string().required(),
  price: Joi.number().required(),
  oldPrice: Joi.number().required(),
  currency: Joi.string().required(),
  productRefId: Joi.string().required(),
  sizes: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      quantity: Joi.number().required(),
    })
  ).required(),
  image: Joi.string().required(),
});

export const cartSchema = Joi.object<Cart>({
  products: Joi.object().pattern(
    Joi.string(),
    cartProductSchema
  ).required(),
  deliveryType: Joi.string().valid('post', 'courier').required(),
});