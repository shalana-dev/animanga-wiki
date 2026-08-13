import { test } from "node:test";
import assert from "node:assert/strict";
import { criarProtecaoExterna, ErroCircuitoAberto, ErroFilaCheia } from "../src/utils/protecaoExterna.js";

test("executa tarefas respeitando o intervalo mínimo (limite global)", async () => {
  const protecao = criarProtecaoExterna({ requisicoesPorSegundo: 10 });
  const inicios = [];

  await Promise.all(
    [1, 2, 3].map(() =>
      protecao.executar(async () => {
        inicios.push(Date.now());
      }),
    ),
  );

  const intervalo1 = inicios[1] - inicios[0];
  const intervalo2 = inicios[2] - inicios[1];
  assert.ok(intervalo1 >= 90, `esperava pelo menos ~100ms entre chamadas, teve ${intervalo1}ms`);
  assert.ok(intervalo2 >= 90, `esperava pelo menos ~100ms entre chamadas, teve ${intervalo2}ms`);
});

test("circuito aberto bloqueia novas tarefas sem executá-las", async () => {
  const protecao = criarProtecaoExterna({ requisicoesPorSegundo: 100 });
  protecao.abrirCircuito(500);

  let executou = false;
  await assert.rejects(
    () =>
      protecao.executar(async () => {
        executou = true;
      }),
    ErroCircuitoAberto,
  );
  assert.equal(executou, false);
});

test("circuito fecha sozinho depois do tempo definido", async () => {
  const protecao = criarProtecaoExterna({ requisicoesPorSegundo: 100 });
  protecao.abrirCircuito(50);

  await new Promise((resolver) => setTimeout(resolver, 80));

  let executou = false;
  await protecao.executar(async () => {
    executou = true;
  });
  assert.equal(executou, true);
});

test("fila cheia rejeita novas tarefas sem executá-las", async () => {
  const protecao = criarProtecaoExterna({ requisicoesPorSegundo: 5, tamanhoMaximoFila: 2 });

  const tarefaLenta = () => new Promise((resolver) => setTimeout(resolver, 100));

  const p1 = protecao.executar(tarefaLenta);
  const p2 = protecao.executar(tarefaLenta);
  const p3 = protecao.executar(tarefaLenta);

  await assert.rejects(() => protecao.executar(tarefaLenta), ErroFilaCheia);

  await Promise.allSettled([p1, p2, p3]);
});
