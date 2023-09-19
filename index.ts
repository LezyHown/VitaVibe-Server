import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { queryParser } from "express-query-parser";
import errorHandler from "strong-error-handler";
import config, { createRequestLimiter } from "./config/config";
import dbconnection from "./mongodb/connection";
import "dotenv/config";

// Настройка API
const app = express();
dbconnection.startConnection();

// Использование необнодимых middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(createRequestLimiter("1s", 20));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(queryParser({
  parseNull: true,
  parseUndefined: true,
  parseBoolean: true,
  parseNumber: true
}));

// API Роутинг
import userRoutes from "./routes/userRoutes";
import productsRoutes from "./routes/productsRoutes";

app.use("/api/user", userRoutes);
app.use("/api/products", productsRoutes);

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