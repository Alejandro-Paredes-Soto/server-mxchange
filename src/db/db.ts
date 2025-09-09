import mysql from "mysql2/promise";
import dotenvFlow from "dotenv-flow";

// const envFile = `.env.${process.env.NODE_ENV || "local"}`;
dotenvFlow.config();

const connectionDb = async () => {
  try {
    const pool = mysql.createPool(process.env.DATABASE_URL || "");
    const connection = await pool.getConnection();

    connection.release();
  } catch (err) {
    throw err;
  }
};

connectionDb();
