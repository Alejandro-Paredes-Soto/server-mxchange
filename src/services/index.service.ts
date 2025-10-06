import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.prod" });
export const hasPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

export const verifyPassword = async (
  password: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

export const signPayload = (
  obj: object | Buffer | string,
  expiresIn: number | any
): string => {
  return jwt.sign(obj, process.env.KEY_JWT || "", { expiresIn: expiresIn });
};

export function generateResetToken(): string {
  return nanoid(100);
}

export const writeErrorLogs = (error: any) => {
  const currentDate = new Date().toLocaleString();
  const fileLogs = path.join(__dirname, "logs.txt");
  const logEntry = `[${currentDate}] ${error}\n`;

  fs.appendFile(fileLogs, logEntry, (err: any) => {
    if (err) {
      console.error("Error al escribir en el archivo de log:", err);
    }
  });
};