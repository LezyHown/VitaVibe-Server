import { createHttpError } from "../../services/httpErrorService";
import { NextFunction, Response } from "express";
import { TypedRequestBody } from "../types";
import { Cart, PaymentData } from "./types";
import { pick } from "lodash";

import Stripe from "stripe";
import orderService from "../../services/orderService";

import UserDto, { IUserPayload } from "../../dtos/userDto";
import userModel from "../../mongodb/models/userModel";
import mailService from "../../services/mail/mailService";
import orderModel from "../../mongodb/models/orderModel";
import promoService from "../../services/promo/promoService";

const stripe = new Stripe(String(process.env.STRIPE_SECRET), { apiVersion: "2023-08-16" });

class OrderController {
  async processPayment(
    req: TypedRequestBody<{ cart: Cart; paymentData: PaymentData; payload: IUserPayload }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cart, paymentData, payload } = req.body;

      // Відхилення замовлення, якщо користувач не має адреси
      if (payload.addressList.list.length === 0 || !payload.invoiceAddress) {
        throw createHttpError(400, "Please select an address");
      }

      const token = JSON.parse(paymentData.paymentMethodData.tokenizationData.token);
      const paymentDetails = await orderService.getPaymentDetails(cart);

      try {
        const paymentCharge = await stripe.charges.create({
          amount: Math.round(paymentDetails.totalPrice * 100),
          currency: paymentDetails.currency,
          description: "Payment for " + paymentDetails.totalCount + " items at VitaVibe",
          source: token.id,
        });

        console.log(
          `Successfully payment was processed by user ${payload._id}: totalPrice: `,
          paymentDetails.totalPrice,
          ", data: ",
          new Date().toLocaleString(),
          ", status: ",
          paymentCharge.status,
          ", product count: ",
          paymentDetails.totalCount
        );

        await orderService.decreaseProductsByCartQuantity(cart.products);
        await promoService.usePromoCode(cart.promocode.code);

        const order = await orderService.createOrderModel(
          payload,
          cart.deliveryType,
          paymentCharge.id,
          paymentDetails
        );
        const user = await userModel.findById(payload._id);

        if (user) {
          user.orders.push(order.id);
          await user.save();

          const orderNum = await orderModel.countDocuments();
          const orderDetails = { ...pick(order, "deliveryAddress", "deliveryType", "orderDate"), orderNum };

          mailService.sendOrderDetails(payload, orderDetails, paymentDetails);

          res.status(200).send({
            message: paymentCharge.status,
            orderId: order.id,
          });
        }
      } catch (e) {
        if (e instanceof Stripe.errors.StripeError) {
          throw createHttpError(400, { error: { code: e.code, message: e.message } });
        } else {
          throw createHttpError(400, { error: e });
        }
      }
    } catch (e) {
      next(e);
    } finally {
      next();
    }
  }
}

export default new OrderController();
