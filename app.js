import express from "express";
import userRouter from "./routes/01_router.js";
import hostRouter from "./routes/02_hostRouter.js";
import paths from "./utils/pathUtil.js";
import { pageNotFound } from "./controller/03_Errors.js";
import path from "path";
const app = express();
app.set("view engine", "ejs");
app.set("views","views");
app.use(express.urlencoded({ extended: true }));
app.use(userRouter);
app.use(hostRouter);
app.use(express.static(path.join(paths , "public"))) ;





app.use(pageNotFound);

app.listen(3001, () => {
  console.log("server is running");
});