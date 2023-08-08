import config from "./config/config";
import "dotenv/config";
import dbconnection from "./mongodb/connection";

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import errorHandler from "strong-error-handler";

// Настройка API
const app = express();
const limiter = rateLimit({
  windowMs: config.ms("1s"),
  max: 20,
  message: "max 20 requests per second",
  keyGenerator: (req: express.Request) => req.ip,
});

dbconnection.startConnection();

// Использование необнодимых middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(limiter);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// API Роутинг
import userRouter from "./routes/userRotute";

app.use("/api/user", userRouter);
app.use(errorHandler({ log: true, rootProperty: false }));

// Настройка server process
process.on("SIGINT", async () => {
  try {
    await dbconnection.closeConnection();
    console.log("\nServer closed connection with mongodb");
    console.log("closing app...");
    process.exit(0);
  } 
  catch (error) {
    console.error("Server haves trouble with disconnecting from MongoDB:", error);
    console.log("closing app...");
    process.exit(1);
  }
});

// Запуск
app.listen(config.PORT, () => {
  console.log(`Server has started on port: ${config.PORT}!`);
});