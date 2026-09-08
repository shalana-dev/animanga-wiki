import { Router } from "express";
import { obterCalendario, obterDestaques } from "../controllers/animes.controller.js";

const router = Router();

router.get("/calendario", obterCalendario);
router.get("/destaques", obterDestaques);

export default router;
