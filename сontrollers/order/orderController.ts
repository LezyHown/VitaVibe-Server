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

const stripe = new Stripe(String(process.env.STRIPE_SECRET), { apiVersion: "2023-08-16" });

class OrderController {
  async processPayment(
    req: TypedRequestBody<{ cart: Cart; paymentData: PaymentData; payload: IUserPayload }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { cart, paymentData, payload } = req.body;
      const { token } = paymentData.paymentMethodData.tokenizationData;
      const paymentDetails = await orderService.getPaymentDetails(cart);

      if (payload.addressList.list.length === 0 || !payload.invoiceAddress) {
        throw createHttpError(400, "Please select an address");
      }
      if (paymentDetails.invalid) {
        const { totalPrice, invalid, mismatchedVariants, paymentVariants } = paymentDetails;
        throw createHttpError(400, { invalid, totalPrice, paymentVariants, mismatchedVariants });
      }

      try {
        const paymentCharge = await stripe.charges.create({
          amount: paymentDetails.totalPrice * 100,
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

        // Исчезновение товаров Отключено
        // await orderService.modifyModelsByCartQuantity(cart.products);

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

          const userDto = new UserDto(user);
          const orderNum = await orderModel.countDocuments();
          const orderDetails = { ...pick(order, "deliveryAddress", "deliveryType", "orderDate"), orderNum };

          mailService.sendOrderDetails(payload, orderDetails, paymentDetails);

          res.status(200).send({
            message: paymentCharge.status,
            details: pick(paymentDetails, ["currency", "totalCount", "totalPrice"]),
            payload: userDto.getPayload(),
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
