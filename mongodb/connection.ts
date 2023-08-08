import "dotenv/config";
import { set, connection, connect } from "mongoose";

const { MONGODB_DATABASE_NAME = "", MONGODB_CONNECTION_STRING = "" } = process.env;
const FULL_CONNECTION_STRING = MONGODB_CONNECTION_STRING.concat(MONGODB_DATABASE_NAME);

set("strictQuery", false);

async function startConnection() {
  await connect(FULL_CONNECTION_STRING)
    .then(() => console.log("\nServer was Completely connected to mongodb"))
    .catch((err: Error) =>
      console.log(`\nServer haves problem with connection to mongodb: `, err)
    );
}

async function closeConnection() {
  await connection
    .close()
    .then(() => console.log("\nserver Stopped connection with mongodb"))
    .catch((err: Error) => console.log(`\nServer haves problem with disconnect mongodb database: `, err));
}

export default { startConnection, closeConnection };
