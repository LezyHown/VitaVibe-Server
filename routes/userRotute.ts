import { Router } from "express";

import userController from "../сontrollers/user/userController";
import { decryptParamsMiddleware } from "../middlewares/cryptoParamsMiddleware";
import { tokenMiddleware } from "../middlewares/tokenMiddleware";

const userRouter = Router();

userRouter.post("/register", userController.registration);
userRouter.post("/login", userController.login);
userRouter.post("/logout", userController.logout);
userRouter.post("/send/otp", tokenMiddleware("REFRESH_TOKEN"), userController.sendOtp);
userRouter.get(
  "/activate/:otp",
  tokenMiddleware("REFRESH_TOKEN", true),
  decryptParamsMiddleware(false),
  userController.activate
);
userRouter.post('/refresh', tokenMiddleware("REFRESH_TOKEN"), userController.refresh);

export default userRouter;