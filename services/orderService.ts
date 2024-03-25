import { IUserPayload } from "./../dtos/userDto";
import { assign, omit, pick } from "lodash";
import { Types } from "mongoose";
import { Cart, MismatchedVariant } from "../сontrollers/order/types";
import productModel from "../mongodb/models/productModel";
import orderModel from "../mongodb/models/orderModel";
import { createHttpError } from "./httpErrorService";
import promoService from "./promo/promoService";

class OrderService {
  async getPaymentDetails(cart: Cart) {
    const { products: cartProducts, deliveryType, promocode } = cart;
    
    if (promocode) {
      var { percentDiscount } = await promoService.testPromoCode(promocode.code);
    }

    const cartVariantKeys = Object.keys(cartProducts);
    const productsIds = cartVariantKeys.map(
      (variantId) => new Types.ObjectId(cartProducts[variantId].productRefId)
    );
    const productModels = await productModel.find({ _id: { $in: productsIds } });

    const mismatchedVariants: MismatchedVariant[] = [];
    const paymentVariants: Cart["products"] = {};
    let totalCount = 0;
    let totalPrice = 0;

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
            // Формуєм зайвий товар, який не може бути купленим (Невідповідний товар)
            mismatchedVariants.push({ variantId, size, quantity: selectedQuantity });
          } else {
            // Ціна товара
            let itemPrice = selectedQuantity * variant.price;
            // Знижка на товар (промокод)
            if (!variant.oldPrice && percentDiscount > 0) {
              itemPrice -= (itemPrice / 100) * percentDiscount;
            }

            // Додаєм ціну до загальної суми
            totalPrice += itemPrice;
            // Загальна кількість товару
            totalCount += selectedQuantity;

            // Будую кожний продукт кошика на основі актуальних даних (уникнаючи підміну даних)
            paymentVariants[variantId] = assign(cartProducts[variantId], {
              ...pick(variant, "color", "oldPrice", "subTitle", "name", "currency"),
              price: Number(itemPrice.toFixed(2)),
              image: variant.images[0].thumbnail,
            });
          }
        });
      }
    });

    const shipping = Number(
      deliveryType === "courier" ? process.env.SHIPPING_COURIER_USD : process.env.SHIPPING_POST_USD
    );

    // ADD SHIPPING COST
    if (totalPrice < Number(process.env.FREE_SHIPPING_THRESHOLD_USD) && totalPrice > 0) {
      totalPrice += shipping;
    }
    // INVALID PAYMENT ERROR
    if (totalPrice === 0 || mismatchedVariants.length > 0) {
      throw createHttpError(400, { invalid: true, totalPrice, paymentVariants, mismatchedVariants });
    }

    return {
      totalCount,
      totalPrice: Number(totalPrice.toFixed(2)),
      currency: productModels[0].variants[0].currency.toLowerCase(),
      mismatchedVariants,
      paymentVariants,
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

            if (variantModel.sizes.every(({ count }) => count === 0)) {
              variantModel.available.available = false;
              variantModel.available.details = "Товар розпродано.";
              await model.save();
            }

            console.log(
              `Product variant ${variantModel.id} was modified. Size modified: ${size} from: ${
                variantModel.sizes[sizeIndex].count + decreaseQuantity
              } to => ${variantModel.sizes[sizeIndex].count}`
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
    });
  }
}

export default new OrderService();
