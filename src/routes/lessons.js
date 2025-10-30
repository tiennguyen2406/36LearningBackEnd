import express from "express";
import { createLesson, getLessons } from "../controllers/lessonsController.js";

const router = express.Router();

router.post("/", createLesson);
router.get("/", getLessons);

export default router;
