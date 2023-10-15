import { IUserPayload } from "./../dtos/userDto";
import { assign, omit, pick } from "lodash";
import { Types } from "mongoose";
import { Cart, CartVariantModel, MismatchedVariant } from "../сontrollers/order/types";
import productModel from "../mongodb/models/productModel";
import orderModel from "../mongodb/models/orderModel";

class OrderService {
  async getPaymentDetails(cart: Cart) {
    const { products: cartProducts, deliveryType } = cart;

    const cartVariantKeys = Object.keys(cartProducts);
    const productsIds = cartVariantKeys.map(
      (variantId) => new Types.ObjectId(cartProducts[variantId].productRefId)
    );
    const productModels = await productModel.find({ _id: { $in: productsIds } });

    const mismatchedVariants: MismatchedVariant[] = [];
    const paymentVariants: Cart["products"] = {};
    var totalCount = 0;
    var totalPrice = 0;

    cartVariantKeys.map((variantId) => {
      const variants = productModels
        .map((model) => model.variants.find((variant) => variant.id === variantId)?.toObject())
        .filter(Boolean);

      for (const variant of variants) {
        variant.sizes.map(({ size, count }: { size: string; count: number }) => {
          const variantId = variant._id;
          const selectedQuantity = cartProducts[variantId].sizes[size]?.quantity as number | undefined;

          if (!selectedQuantity) {
            return;
          }

          if (selectedQuantity < 1 || selectedQuantity > count) {
            mismatchedVariants.push({ variantId, size, quantity: selectedQuantity });
          } else {
            totalPrice += selectedQuantity * variant.price;
            totalCount += selectedQuantity;

            paymentVariants[variantId] = assign(cartProducts[variantId], {
              ...pick(variant, "color", "price", "oldPrice", "subTitle", "name", "currency"),
              image: variant.images[0].thumbnail,
            });
          }
        });
      }
    });

    const shipping = Number(
      deliveryType === "courier" ? process.env.SHIPPING_COURIER_USD : process.env.SHIPPING_POST_USD
    );
    const shippingIncluded = totalPrice < Number(process.env.FREE_SHIPPING_THRESHOLD_USD);

    totalPrice += shippingIncluded && totalPrice > 0 ? shipping : 0;

    return {
      totalCount,
      totalPrice: Number(totalPrice.toFixed(2)),
      currency: productModels[0].variants[0].currency.toLowerCase(),
      mismatchedVariants: mismatchedVariants.length > 0 && mismatchedVariants,
      paymentVariants,
      invalid: totalPrice === 0 || mismatchedVariants.length > 0,
    };
  }

  async decreaseProductsByCartQuantity(products: Cart["products"]) {
    const cartVariantKeys = Object.keys(products);
    const productsIds = cartVariantKeys.map(
      (variantId) => new Types.ObjectId(products[variantId].productRefId)
    );

    const productModels = await productModel.find({ _id: { $in: productsIds } });

    for (const model of productModels) {
      for (const variantId of cartVariantKeys) {
        const variantModel = model.variants.find(({ id }) => id === variantId);
        if (variantModel) {
          const sizeIndex = variantModel.sizes.findIndex(({ size }) => products[variantId].sizes[size]);
          const availableSize = sizeIndex !== -1;

          if (availableSize) {
            const size = variantModel.sizes[sizeIndex].size;
            const decreaseQuantity = Number(products[variantId].sizes[size].quantity);
            variantModel.sizes[sizeIndex].count -= decreaseQuantity;
            await model.save();

            console.log(
              `Product variant ${variantModel.id} was modified. Field: ${size} from: ${
                variantModel.sizes[sizeIndex].count + decreaseQuantity
              } to: ${variantModel.sizes[sizeIndex].count}`
            );
          }
        }
      }
    }
  }

  async createOrderModel(
    payload: IUserPayload,
    deliveryType: string,
    paymentChargeId: string,
    paymentDetails: { paymentVariants: Cart["products"]; totalPrice: number; totalCount: number }
  ) {
    const products = Object.keys(paymentDetails.paymentVariants).map((variantId) => {
      const variant = paymentDetails.paymentVariants[variantId];
      const sizes = Object.keys(variant.sizes).map((size) => ({
        size,
        quantity: variant.sizes[size].quantity,
      }));
      return assign(omit(variant, "sizes"), { variantId, sizes });
    });

    return await orderModel.create({
      customer: payload._id,
      deliveryAddress: payload.addressList.list[payload.addressList.selected],
      invoiceAddress: payload.invoiceAddress,
      totalAmount: paymentDetails.totalPrice,
      totalProductCount: paymentDetails.totalCount,
      deliveryType,
      paymentChargeId,
      products,
      status: "completed",
    });
  }
}

export default new OrderService();
