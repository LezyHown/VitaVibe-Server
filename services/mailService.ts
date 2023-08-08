import { HttpError } from 'http-errors';
import axios, { HttpStatusCode } from "axios";
import path from "path";
import fs from "fs";
import "dotenv/config";

import nodemailer, { Transporter, SendMailOptions, TransportOptions } from "nodemailer";
import { encryptParams } from "../middlewares/cryptoParamsMiddleware";
import ejs from "ejs";
import qs from "qs";
import { IUserPayload } from "../dtos/userDto";
import { createHttpError } from "./httpErrorService";

class MailService {
  private transport: Transporter;
  private mailOptions: SendMailOptions;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      sendingRate: 2,
    } as TransportOptions);

    this.mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: "",
      subject: "",
      text: "",
      html: "",
    };
  }

  public autoSendVerify(payload: IUserPayload): void {
    const data = { payload };
    const DELAY_MS = Number(process.env.AUTO_SENDMAIL_DELAY);

    setTimeout(async () => {
      try {
        const res = await axios.post(process.env.API_URL + "/api/user/send/otp", data);
        console.log("[axios MailService]: " + res.data);
      } catch (err) {
        console.log("[axios MailService]: " + err);
      }
    }, DELAY_MS);
  }

  public sendVerify(payload: IUserPayload, otp: string): void {
    const {
      personalInfo: { email, firstName },
    } = payload;
    const queryParams = qs.stringify({
      data: encryptParams({ payload }),
    });

    const templateData = {
      verificationLink: `${process.env.API_URL}/api/user/activate/${otp}?${queryParams}`,
      firstName,
      otp,
      website: process.env.WEBSITE_NAME,
    };
    const templatePath = path.join(__dirname, "./mailTemplates/verification-mail-template.ejs");
    const template = fs.readFileSync(templatePath, "utf-8");

    this.mailOptions.to = email;
    this.mailOptions.subject = `Verify your email on ${process.env.CLIENT_URL}`;
    this.mailOptions.html = ejs.render(template, templateData);

    this.transport.sendMail(this.mailOptions, (err) => {
      if (err) {
        console.error(`[MailService error]: ${err}`);
      } else {
        console.log(`[MailService success]: ${JSON.stringify(templateData)} sent to ${email}`);
      }
    });
  }
}

export default new MailService();
