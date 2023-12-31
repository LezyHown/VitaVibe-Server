import { Router } from "express";
import { createRequestLimiter } from "../config/config";
import userController from "../сontrollers/user/userController";

import recoveryMiddleware from "../middlewares/recoveryMiddleware";
import { tokenMiddleware } from "../middlewares/tokenMiddleware";
import { decryptParamsMiddleware } from "../middlewares/cryptoParamsMiddleware";

const userRoutes = Router();

/** АВТОРИЗАЦИЯ */
userRoutes.post("/register", createRequestLimiter("1m", 1), userController.registration);
userRoutes.post("/login", userController.login);
userRoutes.post("/logout", userController.logout);
userRoutes.post("/send/otp", tokenMiddleware("ACCESS_TOKEN"), userController.sendOtp);
userRoutes.get(
  "/activate/:otp",
  tokenMiddleware("ACCESS_TOKEN", true), // пропуск ошибки
  decryptParamsMiddleware(false), // пропуск ошибки
  userController.activate
);
userRoutes.post("/refresh", tokenMiddleware("REFRESH_TOKEN"), userController.refresh);
userRoutes.get("/actual/payload", tokenMiddleware("ACCESS_TOKEN"), userController.actualPayload);
userRoutes.post("/send/recovery", createRequestLimiter("1m", 5), userController.sendRecovery);
userRoutes.get("/accept/recovery", decryptParamsMiddleware(), userController.acceptRecovery);
userRoutes.post(
  "/reset/password",
  tokenMiddleware("ACCESS_TOKEN"),
  decryptParamsMiddleware(false),
  recoveryMiddleware,
  createRequestLimiter("1d", 3, "You can't change your password more than 3 times per 24 hours"),
  userController.resetPassword
);

/* ВЗАЕМОДЕЙСТВИЕ */
userRoutes.post("/update/profile", tokenMiddleware("ACCESS_TOKEN"), userController.updateProfile);
userRoutes.patch("/address", tokenMiddleware("ACCESS_TOKEN"), userController.updateAddress);
userRoutes.delete("/address", tokenMiddleware("ACCESS_TOKEN"), userController.removeAddress);
userRoutes.patch("/invoice", tokenMiddleware("ACCESS_TOKEN"), userController.updateInvoiceData);
userRoutes.get("/orders", tokenMiddleware("ACCESS_TOKEN", false, true), userController.getOrders);

export default userRoutes;
