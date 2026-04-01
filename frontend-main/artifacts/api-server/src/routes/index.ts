import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import detectionsRouter from "./detections";
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";
import web3Router from "./web3";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(detectionsRouter);
router.use(alertsRouter);
router.use(analyticsRouter);
router.use(web3Router);

export default router;
