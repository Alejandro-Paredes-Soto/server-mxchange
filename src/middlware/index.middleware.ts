import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "./../db/prismaClient";

// const envFile = `.env.${process.env.NODE_ENV || "local"}`;
dotenv.config({ path: ".env.prod" });
export const MiddleAuthRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (
      !token ||
      token === "null" ||
      token === "undefined" ||
      token === "false"
    ) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const secret = process.env.KEY_JWT || "";
    const decoded: any = jwt.verify(token!, secret);

    if (decoded) {
         next();
        return;
    } else {
      return res.status(401).json({ message: "Token expirado o invalido" });
    }
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};