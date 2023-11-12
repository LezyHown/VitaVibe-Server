import moment from "moment";
import { createHash, randomBytes } from "crypto";
import { HttpStatusCode } from "axios";
import { createHttpError } from "../httpErrorService";

const DEFAULT_DISCOUNT_PERCENT = Number(process.env.SUBSCRIPTION_PERCENT_DISCOUNT);

import promoCodeModel from "../../mongodb/models/promoCodeModel";
import newsSubscriberModel from "../../mongodb/models/newsSubscriberModel";

/** Базове шифрування з md5 */
const md5 = (text: string) => createHash("md5").update(text).digest("hex");

class PromoService {
  async createPromoCode(email: string, code?: string, discount: number = DEFAULT_DISCOUNT_PERCENT) {
    // Перерірка існування моделі
    if (await promoCodeModel.findOne({ email })) {
      throw createHttpError(HttpStatusCode.Conflict, "email already subscribed");
    }

    const originalCode = code ?? randomBytes(5).toString("hex").toUpperCase();

    const { endDate, percentDiscount } = await promoCodeModel.create({
      email,
      //Шифрування промокоду з md5
      code: md5(originalCode),
      percentDiscount: discount,
    });
    await newsSubscriberModel
      .create({ email })
      .catch((_) => console.log("Підписка на новини - пошта ", email, " вже існує."));

    return { code: originalCode, endDate, percentDiscount };
  }
  async testPromoCode(code: string) {
    // Шукаєм зашифрований промокод
    const promocode = await promoCodeModel.findOne({ code: md5(code) });

    if (!promocode) throw createHttpError(HttpStatusCode.NotFound, "Промокод не знайдено");
    const { percentDiscount } = promocode;

    if (moment().isAfter(promocode.endDate)) {
      throw createHttpError(
        HttpStatusCode.BadRequest,
        "Промокод " + code + " більше не дійсний. Був дійсний до: " + promocode.endDate.toLocaleString()
      );
    }
    if (promocode.usageCount >= promocode.usageLimit) {
      throw createHttpError(
        HttpStatusCode.BadRequest,
        "Промокод " + code + " привищує ліміт використань. Скористайся іншим промокодом."
      );
    }

    return { percentDiscount };
  }
  async usePromoCode(code: string) {
    const promocode = await promoCodeModel.findOne({ code: md5(code) });
    if (promocode) {
      promocode.usageCount += 1;
      await promocode.save();
    }
  }
}

export default new PromoService();
