import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import pricesRouter from "./prices";
import tradingRouter from "./trading";
import portfolioRouter from "./portfolio";
import transactionsRouter from "./transactions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(pricesRouter);
router.use(tradingRouter);
router.use(portfolioRouter);
router.use(transactionsRouter);

export default router;
