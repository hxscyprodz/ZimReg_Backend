import { Router, Request, Response } from "express";
import { db } from "../config/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    await db.execute("select 1");

    res.status(200).json({
      success: true,
      status: "healthy",
      message: "Application is running",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      message: "Application is not running",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
