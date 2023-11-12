import { Router } from "express";
import { createRequestLimiter } from "../config/config";
import { decryptParamsMiddleware } from "../middlewares/cryptoParamsMiddleware";
import promoController from "../сontrollers/promo/promoController";

const promoRoutes = Router();

// Запрошення на розсилку новин | Застосування: Сторінка Знижки
promoRoutes.post("/invite/newsletter", createRequestLimiter("5s", 1), promoController.inviteRequest);
// Створення промокоду | Застосування: Перехід по посиланню на розсилку з браузера
promoRoutes.get(
  "/create/code",
  decryptParamsMiddleware(true),
  promoController.create
);
// Перевірка промокоду на існування | Застосування: Сторінка Кошика
promoRoutes.post("/testcode", createRequestLimiter("3s", 1), promoController.testCode);

export default promoRoutes;
