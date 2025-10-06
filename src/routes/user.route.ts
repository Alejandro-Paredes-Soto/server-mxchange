import { Router } from "express";
import {
  Login,
  Register,
 
  LoginGoogle,
  ChangePassword,
} from "./../controllers/user.controller";

import { MiddleAuthRoute } from "./../middlware/index.middleware";


const router = Router();

router.post("/login", Login);
router.post("/loginGoogle", LoginGoogle);
router.post("/register", Register);

router.post("/changePassword", MiddleAuthRoute, ChangePassword);

export default router;