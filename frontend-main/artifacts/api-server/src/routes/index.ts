import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import detectionsRouter from "./detections";
import alertsRouter from "./alerts";
import analyticsRouter from "./analytics";
import web3Router from "./web3";
import uploadRouter from "./upload";
import piracyRouter from "./piracy";
import userRouter from "./user";
import detectContentRouter from "./detectContent";
import { getSupabaseServer } from "../lib/supabase";

const router: IRouter = Router();

/** Resolve `req.userId` from `Authorization: Bearer` (Supabase JWT or demo token) or `x-user-id`. */
router.use(async (req: any, _res, next) => {
  try {
    const rawAuth = req.headers.authorization;
    const authHeader = typeof rawAuth === "string" ? rawAuth : Array.isArray(rawAuth) ? rawAuth[0] : "";

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token.startsWith("demo.")) {
        req.userId = token.slice("demo.".length);
        if (process.env.NODE_ENV === "development") {
          console.debug("[auth] demo bearer userId:", req.userId);
        }
        return next();
      }

      const supabase = getSupabaseServer();
      if (supabase && token.split(".").length === 3) {
        const { data, error } = await supabase.auth.getUser(token);
        if (data?.user?.id && !error) {
          // Prefer email to match legacy rows keyed by `x-user-id`; fall back to auth UUID.
          req.userId = data.user.email?.trim() || data.user.id;
          if (process.env.NODE_ENV === "development") {
            console.debug("[auth] JWT ok, userId:", req.userId);
          }
          return next();
        }
        console.warn("[auth] Bearer JWT rejected:", error?.message ?? "unknown error");
      }
    }

    req.userId = (req.headers["x-user-id"] as string) || null;
    if (!req.userId && process.env.NODE_ENV === "development") {
      console.debug("[auth] no userId: missing Bearer token and x-user-id");
    }
    next();
  } catch (e) {
    console.error("[auth] middleware error:", e);
    req.userId = (req.headers["x-user-id"] as string) || null;
    next();
  }
});

router.use(healthRouter);
router.use(contentRouter);
router.use(detectionsRouter);
router.use(alertsRouter);
router.use(analyticsRouter);
router.use(web3Router);
router.use(uploadRouter);
router.use(piracyRouter);
router.use(userRouter);
router.use(detectContentRouter);

export default router;
