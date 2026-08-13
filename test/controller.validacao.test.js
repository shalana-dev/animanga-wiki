import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarMangas, obterManga, obterCapitulos } from "../src/controllers/mangas.controller.js";

function resFalso() {
  const res = {
    codigoStatus: 200,
    corpo: null,
    headers: {},
    status(codigo) {
      this.codigoStatus = codigo;
      return this;
    },
    json(corpo) {
      this.corpo = corpo;
      return this;
    },
    set(nome, valor) {
      this.headers[nome] = valor;
      return this;
    },
  };
  return res;
}

test("buscarMangas: termo vazio retorna 400", async () => {
  const res = resFalso();
  await buscarMangas({ query: { titulo: "" } }, res);
  assert.equal(res.codigoStatus, 400);
});

test("buscarMangas: termo com 1 caractere retorna 400", async () => {
  const res = resFalso();
  await buscarMangas({ query: { titulo: "a" } }, res);
  assert.equal(res.codigoStatus, 400);
});

test("buscarMangas: termo com mais de 100 caracteres retorna 400", async () => {
  const res = resFalso();
  await buscarMangas({ query: { titulo: "a".repeat(101) } }, res);
  assert.equal(res.codigoStatus, 400);
});

test("obterManga: id que não é UUID retorna 400 sem chamar o MangaDex", async () => {
  const res = resFalso();
  await obterManga({ params: { id: "não-é-um-uuid" } }, res);
  assert.equal(res.codigoStatus, 400);
});

test("obterManga: id com tentativa de path traversal retorna 400", async () => {
  const res = resFalso();
  await obterManga({ params: { id: "../../etc/passwd" } }, res);
  assert.equal(res.codigoStatus, 400);
});

test("obterCapitulos: idioma inválido retorna 400", async () => {
  const res = resFalso();
  await obterCapitulos(
    { params: { id: "801513ba-a712-498c-8f57-cae55b38cc02" }, query: { idioma: "pt-br%26x=1" } },
    res,
  );
  assert.equal(res.codigoStatus, 400);
});

test("obterCapitulos: página negativa retorna 400", async () => {
  const res = resFalso();
  await obterCapitulos(
    { params: { id: "801513ba-a712-498c-8f57-cae55b38cc02" }, query: { pagina: "-5" } },
    res,
  );
  assert.equal(res.codigoStatus, 400);
});

test("obterCapitulos: página maior que o limite retorna 400", async () => {
  const res = resFalso();
  await obterCapitulos(
    { params: { id: "801513ba-a712-498c-8f57-cae55b38cc02" }, query: { pagina: "99999" } },
    res,
  );
  assert.equal(res.codigoStatus, 400);
});
