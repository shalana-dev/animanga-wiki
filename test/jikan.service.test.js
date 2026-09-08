import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buscarDestaquesTemporada,
  buscarAgendaSemanal,
  _resetProtecaoParaTestes,
} from "../src/services/jikan.service.js";
import { _limparCache } from "../src/utils/cache.js";

beforeEach(() => {
  _limparCache();
  _resetProtecaoParaTestes();
});

function mockFetch(implementacao) {
  const original = global.fetch;
  global.fetch = implementacao;
  return () => {
    global.fetch = original;
  };
}

function respostaLista(data) {
  return { ok: true, status: 200, headers: new Headers(), json: async () => ({ data }) };
}

function animeTemporada(malId, { titulo = `Anime ${malId}`, score = 7, capa = `capa-${malId}.jpg` } = {}) {
  return {
    mal_id: malId,
    title: titulo,
    title_english: `${titulo} EN`,
    type: "TV",
    status: "Currently Airing",
    score,
    synopsis: `Sinopse de ${titulo}.`,
    url: `https://myanimelist.net/anime/${malId}`,
    images: { jpg: { large_image_url: `https://cdn.myanimelist.net/${capa}` } },
  };
}

test("buscarDestaquesTemporada: normaliza, filtra sem capa e ordena por nota decrescente", async () => {
  const restaurar = mockFetch(async () =>
    respostaLista([
      animeTemporada(1, { score: 6.5 }),
      animeTemporada(2, { score: 9.1 }),
      { ...animeTemporada(3, { score: 10 }), images: { jpg: {} } }, // sem capa: sai
    ]),
  );

  try {
    const resultado = await buscarDestaquesTemporada();
    assert.equal(resultado.total, 2);
    assert.deepEqual(
      resultado.resultados.map((item) => item.mal_id),
      [2, 1],
    );
    assert.equal(resultado.resultados[0].score, 9.1);
    assert.equal(resultado.resultados[0].imagemAlta, "https://cdn.myanimelist.net/capa-2.jpg");
  } finally {
    restaurar();
  }
});

test("buscarDestaquesTemporada: remove repetição por mal_id e por URL de capa", async () => {
  const restaurar = mockFetch(async () =>
    respostaLista([
      animeTemporada(1, { capa: "mesma.jpg" }),
      animeTemporada(1, { capa: "mesma.jpg" }), // mesmo id
      animeTemporada(2, { capa: "mesma.jpg" }), // mesma capa
      animeTemporada(3, { capa: "outra.jpg" }),
    ]),
  );

  try {
    const resultado = await buscarDestaquesTemporada();
    assert.deepEqual(
      resultado.resultados.map((item) => item.mal_id),
      [1, 3],
    );
  } finally {
    restaurar();
  }
});

test("buscarDestaquesTemporada: 429 vira ErroServicoExterno sem retry automático", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return {
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "8" }),
      json: async () => ({}),
    };
  });

  try {
    await assert.rejects(buscarDestaquesTemporada(), (erro) => {
      assert.equal(erro.servico, "Jikan");
      assert.equal(erro.status, 429);
      assert.equal(erro.retryAfter, "8");
      return true;
    });
    assert.equal(chamadas, 1);
  } finally {
    restaurar();
    _resetProtecaoParaTestes();
  }
});

test("buscarDestaquesTemporada: 503 tenta de novo uma vez e depois funciona", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    if (chamadas === 1) {
      return { ok: false, status: 503, headers: new Headers(), json: async () => ({}) };
    }
    return respostaLista([animeTemporada(1)]);
  });

  try {
    const resultado = await buscarDestaquesTemporada();
    assert.equal(chamadas, 2);
    assert.equal(resultado.total, 1);
  } finally {
    restaurar();
  }
});

test("buscarDestaquesTemporada: falha de rede vira ErroServicoExterno 504", async () => {
  const restaurar = mockFetch(async () => {
    throw new Error("MyAnimeList may be down");
  });

  try {
    await assert.rejects(buscarDestaquesTemporada(), (erro) => {
      assert.equal(erro.servico, "Jikan");
      assert.equal(erro.status, 504);
      return true;
    });
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: mapeia o dia da semana para o id em português e ignora dias desconhecidos", async () => {
  const restaurar = mockFetch(async () =>
    respostaLista([
      { ...animeTemporada(1), broadcast: { day: "Mondays", time: "23:30" } },
      { ...animeTemporada(2), broadcast: { day: "Saturdays", time: "01:00" } },
      { ...animeTemporada(3), broadcast: { day: "Unknown", time: null } },
      { ...animeTemporada(4), broadcast: null },
    ]),
  );

  try {
    const resultado = await buscarAgendaSemanal();
    assert.equal(resultado.total, 2);
    assert.deepEqual(
      resultado.resultados.map((item) => [item.mal_id, item.dia, item.horarioJST]),
      [
        [1, "segunda", "23:30"],
        [2, "sabado", "01:00"],
      ],
    );
    assert.equal(resultado.resultados[0].airingAt, null);
  } finally {
    restaurar();
  }
});
