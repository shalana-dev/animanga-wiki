import { Router } from "express";
import {
  buscarMangas,
  obterColecaoInicial,
  obterManga,
  obterCapitulos,
} from "../controllers/mangas.controller.js";

const router = Router();

router.get("/mangas", buscarMangas);
// precisa vir antes de /mangas/:id, senão "colecao-inicial" vira o :id
router.get("/mangas/colecao-inicial", obterColecaoInicial);
router.get("/mangas/:id", obterManga);
router.get("/mangas/:id/capitulos", obterCapitulos);

export default router;
