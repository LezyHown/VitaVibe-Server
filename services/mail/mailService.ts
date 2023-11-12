import { UserAddress } from "./../../mongodb/models/userModel";
import axios, { HttpStatusCode } from "axios";
import path from "path";
import fs from "fs";
import "dotenv/config";

import nodemailer, { Transporter, SendMailOptions, TransportOptions } from "nodemailer";
import { encryptParams } from "../../middlewares/cryptoParamsMiddleware";
import { createHttpError } from "../httpErrorService";
import ejs from "ejs";
import qs from "qs";
import { IUserPayload } from "../../dtos/userDto";
import { Cart } from "../../сontrollers/order/types";
import moment from "moment";
const { CLIENT_URL, API_URL, BRAND, SMTP_EMAIL, SMTP_HOST, SMTP_PASSWORD, AUTO_SENDMAIL_DELAY } = process.env;

class MailService {
  private transport: Transporter;
  private mailOptions: SendMailOptions;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
      sendingRate: 2,
    } as TransportOptions);

    this.mailOptions = {
      from: SMTP_EMAIL,
      to: "",
      subject: "",
      text: "",
      html: "",
    };
  }

  public autoSendVerify(accessToken: string): void {
    const DELAY_MS = Number(AUTO_SENDMAIL_DELAY);

    setTimeout(async () => {
      try {
        const res = await axios.post(API_URL + "/api/user/send/otp", null, {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        });
        console.log("[axios MailService]: " + res.data);
      } catch (err) {
        console.log("[axios MailService]: " + err);
      }
    }, DELAY_MS);
  }
  private getHtmlTemplate(templateName: string, params: object) {
    const templatePath = path.join(__dirname, `./templates/${templateName}.ejs`);
    const template = fs.readFileSync(templatePath, "utf-8");

    return ejs.render(template, { ...params, website: CLIENT_URL, brand: BRAND });
  }
  private sendMail(email: string, title: string, content: string, successLog?: string) {
    this.mailOptions.to = email;
    this.mailOptions.subject = title;
    this.mailOptions.html = content;

    this.transport.sendMail(this.mailOptions, (err) => {
      if (err) {
        console.error(`[MailService Fail]: ${err}`);
      } else {
        console.log(`[MailService]: ${successLog ?? "something"} successfully sent to ${email}`);
      }
    });
  }
  public sendVerify(payload: IUserPayload, otp: string): void {
    const { email, firstName } = payload.personalInfo;
    const queryParams = qs.stringify(encryptParams({ payload }));

    this.sendMail(
      email,
      `Verify your Email`,
      this.getHtmlTemplate("verification-mail", {
        link: `${API_URL}/api/user/activate/${otp}?${queryParams}`,
        firstName,
        otp,
      }),
      `otp code ${otp}`
    );
  }
  public sendRecovery(email: string, accessToken: string, prevPassword: string) {
    const timeout = new Date();
    timeout.setMinutes(timeout.getMinutes() + 1);

    const queryParams = qs.stringify(encryptParams({ accessToken, prevPassword, timeout }));
    const link = `${API_URL}/api/user/accept/recovery?${queryParams}`;

    this.sendMail(
      email,
      "Forgot your password?",
      this.getHtmlTemplate("recovery", { link }),
      "recovery link"
    );
  }
  public sendOrderDetails(
    payload: IUserPayload,
    orderDetails: {
      orderNum: number;
      deliveryAddress: UserAddress;
      deliveryType?: string;
      orderDate: Date;
    },
    paymentDetails: {
      paymentVariants: Cart["products"];
      totalPrice: number;
      currency: string;
      totalCount: number;
    }
  ) {
    const { orderNum } = orderDetails;
    const template = {
      title: "Order (замовлення) № " + orderNum,
      content: this.getHtmlTemplate("order-details", {
        ...paymentDetails,
        ...orderDetails,
      }),
    };
    // Send about order to own server and the client
    this.sendMail(
      payload.personalInfo.email,
      template.title,
      template.content,
      `Інформація про замовлення №${orderNum} була успішно відправлена користувачу`
    );
    this.sendMail(
      String(SMTP_EMAIL),
      template.title,
      template.content,
      `Серверу також відправлено повідомлення про замовлення №${orderNum}`
    );
  }
  /**
   * ПРОМОКОД - ЛИСТ НА ЗАПРОШЕННЯ ПІДПИСКИ
   * @param email електронна пошта
   * @param percentDiscount процентна знижка (1-100)
   */
  public sendPromocodeInvite(email: string, percentDiscount: number) {
    const queryParams = qs.stringify(encryptParams({ email }));
    const link = `${API_URL}/api/promo/create/code?${queryParams}`;

    if (percentDiscount < 1 || percentDiscount > 100) {
      throw createHttpError(HttpStatusCode.BadRequest, "Процентна знижка має бути від 1 до 100");
    }

    this.sendMail(
      email,
      "Ще крок до знижок.. Підтверди підписку ✅",
      this.getHtmlTemplate("promocode-invite", { link, percentDiscount }),
      "запит на підписку"
    );
  }
  /**
   * ВИДАЧА ПРОМОКОДУ - ПІСЛЯ ПІДПИСКИ
   * @param email електронна пошта
   * @param code промокод
   * @param percentDiscount процентна знижка (1-100)
   * @param endDate дата завершення промокода
   */
  public sendPromocode(email: string, code: string, percentDiscount: number, endDate: Date) {
    this.sendMail(
      email,
      "Дякуємо, що підписались на розсилку VitaVibe! 🥳️",
      this.getHtmlTemplate("promocode-subscribed", {
        percentDiscount,
        code,
        endDate: moment(endDate).format("DD.MM.YYYY hh:mm:ss"),
        website: CLIENT_URL
      }),
      "промокод"
    );
  }
}

export default new MailService();
