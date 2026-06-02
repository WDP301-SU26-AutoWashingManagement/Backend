import { Router } from "express";
import { makeController } from "../controllers/make.controller";

const router = Router();

router.get("/", makeController.getList);
router.get("/name/:makeName", makeController.getByName);

export default router;