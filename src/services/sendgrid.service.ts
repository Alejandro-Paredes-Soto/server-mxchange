import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

import ejs from "ejs";
import fs from "fs";
import path from "path";

// const envFile = `.env.${process.env.NODE_ENV || "local"}`;
dotenv.config({ path: ".env.local" });
sgMail.setApiKey(process.env.KEY_SENDGRID || "");

export const sendMail = async (
  resetLink: string,
  userName: string,
  toEmail: string
) => {
  const pathHtml = path.resolve(
    __dirname,
    "../../src/views/linkResetPasswordHtml.ejs"
  );

  if (!fs.existsSync(pathHtml)) {
    throw new Error(`No se encontró la plantilla en: ${pathHtml} ${path.resolve(
    __dirname,
    "../../src/views/linkResetPasswordHtml.ejs"
  )}`);
  }

  const linkResetPasswordHtml = fs.readFileSync(pathHtml, "utf-8");
  const html = ejs.render(linkResetPasswordHtml, {
    username: userName,
    resetLink: resetLink,
    urlCandado: process.env.URL_CANDADO,
  });

  const msg = {
    from: process.env.FROM_EMAIL || "",
    to: toEmail,
    subject: "Solicitud de recuperación de contraseña",
    text: "Recupera tu contraseña",
    html: html,
  };

  try {
    const resMail = await sgMail.send(msg);

    return resMail;
  } catch (error: any) {
    console.log(error)
    throw error;
  }
};

export const SendEmailWelcomeUser = async (
  nameUser: string,
  linkApp: string,
  toEmail: string
) => {
  const pathHtml = path.resolve(
    __dirname,
    "../../src/views/welcomeUserHtml.ejs"
  );

  if (!fs.existsSync(pathHtml)) {
    throw new Error(`No se encontró la plantilla en: ${pathHtml}`);
  }

  const linkWelcomeUserHtml = fs.readFileSync(pathHtml, "utf-8");
  const html = ejs.render(linkWelcomeUserHtml, {
    urlLogo: process.env.URL_LOGO,
  });

  const msg = {
    from: process.env.FROM_EMAIL || "",
    to: toEmail,
    subject: "Bienvenido",
    text: "Te damos la bienvenida a PCinBOX Bajío",
    html: html,
  };

  try {
    const resMail = await sgMail.send(msg);

    return resMail;
  } catch (error: any) {
    throw error;
  }
};