import dotenv from "dotenv";
import { Request, Response } from "express";
import { prisma } from "./../db/prismaClient";
import {
  generateResetToken,
  hasPassword,
  writeErrorLogs,
} from "./../services/index.service";

import { sendMail } from "./../services/sendgrid.service";
import path from "path";
import fs from "fs";
import { format } from "date-fns-tz";
// const envFile = `.env.${process.env.NODE_ENV || "local"}`;
dotenv.config({ path: ".env.local" });

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, message: "Faltan campos" });
    }

    const slcUser = await prisma.users.findFirst({
      where: {
        email: email,
      },
      select: {
        email: true,
        name: true,
        idUser: true,
        password: true,
      },
    });

    if (!slcUser) {
      return res.status(400).json({
        ok: false,
        message: `Cuenta con correo ${email} no encontrado`,
      });
    }

    if (!slcUser.password) {
      return res.status(400).json({
        ok: false,
        message: "Ésta cuenta no tiene contraseña, fue creada con Google",
      });
    }

    //Validar si el usuario a solicitado 3 veces o mas el servicio de reseteo de contrasena
    const currentDate = new Date();
    const twentyFourHoursAgo = new Date(
      currentDate.getTime() - 24 * 60 * 60 * 1000
    );

    // Contar intentos de reseteo en las últimas 24 horas
    const resetAttempts = await prisma.resetpassword.findMany({
      where: {
        idUser: slcUser.idUser,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    if (resetAttempts.length >= 3) {
      return res.status(400).json({
        ok: false,
        message: `Has superado el límite de 3 intentos de reseteo de contraseña en un periodo de 24 horas. Por favor, espera antes de intentarlo nuevamente.`,
      });
    }

    //Enviar emails
    let gnrResetToken = generateResetToken();

    const expiryToken = new Date(Date.now() + 1000 * 60 * 60 * 6); //Expira en 6 horas
    const dateExpiryTokenDb = format(expiryToken, "yyyy-MM-dd HH:mm:ss", {
      timeZone: "America/Mexico_City",
    });

    const resetLink = `${process.env.SERVER}/api/v1/resetpassword/resFileLinkResetPass?token=${gnrResetToken}&idUser=${slcUser.idUser}`;

    try {
      await sendMail(resetLink, slcUser.name, slcUser.email);
    } catch (error: any) {
      console.log(error.message)
      writeErrorLogs(error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo enviar el correo, intentelo de nuevo",
      });
    }

    try {
      await prisma.resetpassword.create({
        data: {
          idUser: slcUser.idUser,
          expiryToken: dateExpiryTokenDb,
          refreshToken: gnrResetToken,
        },
      });

      return res.json({
        ok: true,
        message: `Correo de recuperación enviado`,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message,
        message: "Error interno del servidor",
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      message: "Error interno del servidor",
    });
  }
};

export const resFileLinkResetPass = async (req: Request, res: Response) => {
  try {
   const pathHtml = path.resolve(
      __dirname,
      "../../src/views/resetPasswordHtml.ejs"
    );

    if (!fs.existsSync(pathHtml)) {
      throw new Error(`No se encontró la plantilla en: ${pathHtml} ${path.resolve(
      __dirname,
      "../../src/views/resetPasswordHtml.ejs"
    )}`);
    }


    return res.render(pathHtml, {
      server: process.env.SERVER || "",
      linkApp: `${process.env.BASE_URL_APP}/inicio`,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      message: "Error interno del servidor",
    });
  }
};


export const changePassword = async (req: Request, res: Response) => {
  try {
    const { newPassword, token, idUser } = req.body;

    const currentDate = new Date();

    if (!token || !idUser || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "Faltan los campos de token o idUser, intentelo de nuevo",
      });
    }

    let slcUserResetPass = await prisma.resetpassword.findFirst({
      where: {
        idUser: Number(idUser),
        refreshToken: String(token),
      },
    });

    if (!slcUserResetPass) {
      return res.status(400).json({
        ok: false,
        message: `Usuario o token no encontrado, intentelo de nuevo`,
      });
    }

    const resetDateToken = new Date(slcUserResetPass.expiryToken!);

    if (resetDateToken < currentDate) {
      return res.status(403).json({
        ok: false,
        message: "El token es invalido o ya expiro",
      });
    }

    if (!slcUserResetPass.active) {
      return res.status(403).json({
        ok: false,
        message: "El token ya se usó, intentelo de nuevo",
      });
    }

    const hNewPass = await hasPassword(newPassword);

    await prisma.users.update({
      data: {
        password: hNewPass,
      },
      where: {
        idUser: Number(idUser),
      },
    });

    const tokenRecord = await prisma.resetpassword.findFirst({
      where: {
        idUser: Number(idUser),
        refreshToken: token,
      },
    });

    if (!tokenRecord) {
      return res
        .status(404)
        .json({ ok: false, message: "Token no encontrado" });
    }

    await prisma.resetpassword.update({
      data: {
        active: 0,
      },
      where: {
        idResetPassword: tokenRecord.idResetPassword,
      },
    });

    return res.status(200).json({
      ok: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      message: "Error interno del servidor",
    });
  }
};