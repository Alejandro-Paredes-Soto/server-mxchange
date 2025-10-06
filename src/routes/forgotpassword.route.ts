import { Router } from "express";
import {
forgotPassword,
changePassword,
resFileLinkResetPass
} from "./../controllers/forgotpassword.controller";



const router = Router();


router.post("/forgotPassword", forgotPassword);
router.get("/resFileLinkResetPass", resFileLinkResetPass);
router.post("/changePassword", changePassword);


export default router;
