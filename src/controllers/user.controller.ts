import { Request, Response } from "express";
import { sign } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "./../db/prismaClient";
import dotenvFlow from "dotenv-flow";

dotenvFlow.config();

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
