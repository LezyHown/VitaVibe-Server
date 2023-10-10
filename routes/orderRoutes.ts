import { Router } from "express";
import { tokenMiddleware } from "../middlewares/tokenMiddleware";
import orderController from "../сontrollers/order/orderController";

const orderRoutes = Router();

orderRoutes.post(
  "/process/payment",
  tokenMiddleware("ACCESS_TOKEN", false, true),
  orderController.processPayment
);

export default orderRoutes;
