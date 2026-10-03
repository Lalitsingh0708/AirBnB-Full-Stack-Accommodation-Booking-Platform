import express from "express";
import {
    getRegister,
    getLogin,
    postRegister,
    postLogin,
    postLogout,
} from "../controller/authController.js";

const authRouter = express.Router();

authRouter.get("/auth/register", getRegister);
authRouter.get("/auth/login", getLogin);
authRouter.post("/auth/register", postRegister);
authRouter.post("/auth/login", postLogin);
authRouter.get("/auth/logout", postLogout);
authRouter.post("/auth/logout", postLogout);

export default authRouter;
