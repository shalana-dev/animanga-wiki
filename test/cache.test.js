import { test } from "node:test";
import assert from "node:assert/strict";
import {
  obterDoCache,
  salvarNoCache,
  comRequisicaoCompartilhada,
  comRespostaDeReserva,
  _limparCache,
} from "../src/utils/cache.js";

test("salva e recupera do cache", () => {
  salvarNoCache("chave-teste-1", { ok: true });
  assert.deepEqual(obterDoCache("chave-teste-1"), { ok: true });
});

test("expira depois do TTL", async () => {
  salvarNoCache("chave-teste-2", { ok: true }, 10);
  await new Promise((resolver) => setTimeout(resolver, 30));
  assert.equal(obterDoCache("chave-teste-2"), null);
});

test("chave inexistente retorna null", () => {
  assert.equal(obterDoCache("chave-que-nunca-existiu"), null);
});

test("comRequisicaoCompartilhada: chamadas simultâneas iguais disparam só uma execução real", async () => {
  let chamadas = 0;
  const executar = async () => {
    chamadas += 1;
    await new Promise((resolver) => setTimeout(resolver, 20));
    return { valor: "resultado" };
  };

  const [a, b, c] = await Promise.all([
    comRequisicaoCompartilhada("chave-simultanea", executar),
    comRequisicaoCompartilhada("chave-simultanea", executar),
    comRequisicaoCompartilhada("chave-simultanea", executar),
  ]);

  assert.equal(chamadas, 1);
  assert.deepEqual(a, { valor: "resultado" });
  assert.deepEqual(b, { valor: "resultado" });
  assert.deepEqual(c, { valor: "resultado" });
});

test("comRequisicaoCompartilhada: segunda chamada depois de pronta usa cache, não repete", async () => {
  let chamadas = 0;
  const executar = async () => {
    chamadas += 1;
    return { valor: chamadas };
  };

  const primeira = await comRequisicaoCompartilhada("chave-sequencial", executar);
  const segunda = await comRequisicaoCompartilhada("chave-sequencial", executar);

  assert.equal(chamadas, 1);
  assert.deepEqual(primeira, segunda);
});

test("cache respeita limite máximo de tamanho", () => {
  for (let i = 0; i < 510; i += 1) {
    salvarNoCache(`chave-lote-${i}`, { i });
  }
  assert.equal(obterDoCache("chave-lote-0"), null);
  assert.deepEqual(obterDoCache("chave-lote-509"), { i: 509 });
});

test("comRespostaDeReserva: entrega o valor novo enquanto executar funciona", async () => {
  _limparCache();
  const resultado = await comRespostaDeReserva("chave-reserva-ok", async () => ({ valor: 1 }), 5);
  assert.deepEqual(resultado, { valor: 1 });
});

test("comRespostaDeReserva: se executar falhar depois de um sucesso, devolve a última resposta boa marcada obsoleta", async () => {
  _limparCache();
  let modo = "ok";
  const executar = async () => {
    if (modo === "ok") return { valor: "bom" };
    throw new Error("serviço caiu");
  };

  const bom = await comRespostaDeReserva("chave-reserva", executar, 5);
  assert.deepEqual(bom, { valor: "bom" });

  await new Promise((resolver) => setTimeout(resolver, 20)); // deixa o cache fresco expirar
  modo = "erro";
  const obsoleto = await comRespostaDeReserva("chave-reserva", executar, 5);
  assert.deepEqual(obsoleto, { valor: "bom", obsoleto: true });
});

test("comRespostaDeReserva: sem resposta boa anterior, propaga o erro", async () => {
  _limparCache();
  await assert.rejects(
    comRespostaDeReserva(
      "chave-sem-reserva",
      async () => {
        throw new Error("serviço caiu");
      },
      5,
    ),
  );
});
