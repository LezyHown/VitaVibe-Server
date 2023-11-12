import moment from "moment";
import { Schema, model } from "mongoose";

const Promocode = new Schema({
  // Зашифрований код знижки
  code: { type: String, required: true, unique: true },
  // Створений завдяки пошті
  email: { type: String, required: true, unique: true },
  // Відсоток знижки
  percentDiscount: { type: Number, required: true },
  // Ліміт кількості використань
  // Замовчування: 1
  usageLimit: { type: Number, default: 1 },
  // Кількість використань
  // Замовчування: 0
  usageCount: { type: Number, default: 0 },
  // Дата створення
  startDate: { type: Date, default: () => moment().toDate() },
  // Кінець дійсності
  // Замовчування: 7 ДНІВ
  endDate: { type: Date, default: () => moment().add(7, "days").toDate() },
  // Автовидалення
  // Замовчування: 5 МІСЯЦІВ
  expiryAt: { type: Date, default: () => moment().add(5, "months").toDate() },
}, { versionKey: false });

Promocode.index({ "expiryAt": 1 }, { expireAfterSeconds: 0 });
Promocode.index({ "code": 1, "createdByEmail": 1 });

export default model("Promocode", Promocode);