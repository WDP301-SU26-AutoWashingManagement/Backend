import { Router } from "express";
import { vehicleModelController } from "../controllers/vehicleModel.controller";

const router = Router();

router.get("/", vehicleModelController.getList);
router.get("/name/:modelName", vehicleModelController.getByName);

export default router;