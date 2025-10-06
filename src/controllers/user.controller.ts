import { Request, Response } from "express";
import { sign } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { SendEmailWelcomeUser } from "./../services/sendgrid.service";
import {
  hasPassword,
  signPayload,
  verifyPassword,
  writeErrorLogs,
} from "./../services/index.service";
import { prisma } from "./../db/prismaClient";
import dotenv from "dotenv";
import { DateTime } from "luxon";


dotenv.config();

export const Login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: "Faltan campos en el body json" });
    }

    const slcUser = await prisma.users.findFirst({
      select: {
        idUser: true,
        password: true,
        email: true,

        name: true,
      },
      where: {
        email: email,
      },
    });

    if (!slcUser) {
      return res.status(403).json({
        ok: false,
        message: `La cuenta con el correo ${email} no existe en el sistema`,
      });
    }

    if (!slcUser.password) {
      return res.status(400).json({
        ok: false,
        message: `El usuario ${slcUser.email} no tiene contraseña`,
      });
    }
    //Verificamos que si este correcta su password
    const veryPass: boolean = await bcrypt.compare(password, slcUser.password!);

    if (!veryPass) {
      return res.status(400).json({
        ok: false,
        message: "La contraseña o el correo electrónico son incorrectos",
      });
    }

    let sendToken = null;

    sendToken = sign(
      {
        email,
        name: slcUser.name,
        idUser: slcUser.idUser,
      },
      process.env.KEY_JWT || "",
      {
        expiresIn: "3d",
      }
    );

    return res.status(200).json({
      ok: true,
      message: "Logueado!!",
      data: {
        token: sendToken,
        email: slcUser.email,
        name: slcUser.name,
        idUser: slcUser.idUser,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: true,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const Register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ ok: false, message: "Faltan campos en el body json" });

    const isExistEmail = await prisma.users.findFirst({
      where: {
        email: email,
      },
      select: {
        email: true,
      },
    });

    if (isExistEmail) {
      return res
        .status(400)
        .json({ ok: false, message: `El correo ${email} ya está registrado` });
    }

    //Encriptamos la password
    const hPass: string = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        name: name,
        email: email,
        password: hPass,
      },
    });

    return res.status(200).json({
      ok: true,
      mesage: `Usuario ${name} registrado correctamente`,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

export const LoginGoogle = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res
        .status(400)
        .json({ ok: false, message: "Faltan campos en el body json" });
    }

    let slcUser = null;

    slcUser = await prisma.users.findFirst({
      where: {
        email: email,
      },
      select: {
        idUser: true,
        email: true,
        name: true,
      },
    });

    if (!slcUser) {
      
      slcUser = await prisma.users.create({
        data: {
          email: email,
          name: name,
          password: "",
         
        },
        select: {
          idUser: true,
          email: true,
          name: true,
       
        },
      });

      try {
        await SendEmailWelcomeUser(
          `${name}`,
          `${process.env.BASE_URL_APP}/principal`,
          email
        );
      } catch (error: any) {
        //Notificar cuando no se haya enviado el correo
        //writeErrorLogs(error);
      }
    }

    let sendToken = null;

    //Generamos el token y dura 3 dias
    sendToken = signPayload(
      {
        email,
        idUser: slcUser.idUser.toString(),
      },
      "3d"
    );

    return res
      .status(200)

      .json({
        ok: true,
        message: "Logueado!!",
        data: {
          token: sendToken,
          email: slcUser.email,
          name: slcUser.name,
  
          idUser: Number(slcUser.idUser.toString()),
        },
      });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      message: "Error interno del servidor",
    });
  }
};

export const ChangePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, idUser } = req.body;

    const findPassHas = await prisma.users.findFirst({
      where: {
        idUser: idUser,
      },
      select: {
        password: true,
      },
    });

    if (!findPassHas?.password) {
      return res
        .status(400)
        .json({ ok: false, message: "Contrasena no encontrada" });
    }

    let verifyCurrentPass = await verifyPassword(
      currentPassword,
      findPassHas.password
    );

    if (!verifyCurrentPass) {
      return res
        .status(400)
        .json({ ok: false, message: "La contraseña actual es incorrecta" });
    }
    const createdAt = DateTime.now()
      .setZone("America/Mexico_City", { keepLocalTime: true })
      .toJSDate();

    let newPasswordInsert = await hasPassword(newPassword);

    const insertNewPass = await prisma.users.update({
      where: {
        idUser: idUser,
      },
      data: {
        password: newPasswordInsert,
      },
    });

    if (insertNewPass) {
      await prisma.changepassword.create({
        data: {
          userId: idUser,
      
        },
      });

      return res.status(200).json({
        ok: true,
        message: "Contraseña actualizada correctamente.",
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};