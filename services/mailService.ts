import axios from "axios";
import path from "path";
import fs from "fs";
import "dotenv/config";

import nodemailer, { Transporter, SendMailOptions, TransportOptions } from "nodemailer";
import { encryptParams } from "../middlewares/cryptoParamsMiddleware";
import ejs from "ejs";
import qs from "qs";
import { IUserPayload } from "../dtos/userDto";
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
            Authorization: "Bearer " + accessToken
          }
        });
        console.log("[axios MailService]: " + res.data);
      } catch (err) {
        console.log("[axios MailService]: " + err);
      }
    }, DELAY_MS);
  }

  public getHtmlTemplate(templateName: string, params: object) {
    const templatePath = path.join(__dirname, `./mailTemplates/${templateName}.ejs`);
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
        console.log(`[MailService]: ${successLog} successfully sent to ${email}`);
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
}

export default new MailService();
