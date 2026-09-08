import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { buscarAgendaSemanal, _resetProtecaoParaTestes } from "../src/services/anilist.service.js";
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

function itemAgenda(idMal, { titulo = `Anime ${idMal}`, airingAt = 1_700_000_000, episode = 1 } = {}) {
  return {
    airingAt,
    episode,
    media: {
      id: idMal + 1000,
      idMal,
      siteUrl: `https://anilist.co/anime/${idMal}`,
      title: { romaji: `${titulo} romaji`, english: titulo },
      coverImage: {
        extraLarge: `https://s4.anilist.co/${idMal}-xl.jpg`,
        large: `https://s4.anilist.co/${idMal}.jpg`,
      },
    },
  };
}

function paginaAgenda({ schedules, hasNextPage = false }) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      data: { Page: { pageInfo: { hasNextPage }, airingSchedules: schedules } },
    }),
  };
}

test("buscarAgendaSemanal: normaliza os itens e usa idMal como mal_id", async () => {
  const restaurar = mockFetch(async () =>
    paginaAgenda({ schedules: [itemAgenda(101), itemAgenda(102)] }),
  );

  try {
    const resultado = await buscarAgendaSemanal();
    assert.equal(resultado.total, 2);
    assert.equal(resultado.resultados[0].mal_id, 101);
    assert.equal(resultado.resultados[0].airingAt, 1_700_000_000);
    assert.equal(resultado.resultados[0].title, "Anime 101");
    assert.equal(resultado.resultados[0].imagemAlta, "https://s4.anilist.co/101-xl.jpg");
    assert.equal(resultado.resultados[0].dia, null, "o dia é resolvido no navegador, não aqui");
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: para de paginar quando hasNextPage é false", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return paginaAgenda({ schedules: [itemAgenda(200 + chamadas)], hasNextPage: false });
  });

  try {
    await buscarAgendaSemanal();
    assert.equal(chamadas, 1);
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: nunca passa de 4 páginas mesmo com hasNextPage sempre true", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return paginaAgenda({ schedules: [itemAgenda(300 + chamadas)], hasNextPage: true });
  });

  try {
    await buscarAgendaSemanal();
    assert.equal(chamadas, 4);
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: remove repetição por mal_id", async () => {
  const restaurar = mockFetch(async () =>
    paginaAgenda({
      schedules: [itemAgenda(101, { episode: 1 }), itemAgenda(101, { episode: 2 }), itemAgenda(102)],
    }),
  );

  try {
    const resultado = await buscarAgendaSemanal();
    assert.equal(resultado.total, 2);
    assert.deepEqual(
      resultado.resultados.map((item) => item.mal_id),
      [101, 102],
    );
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: 429 vira ErroServicoExterno com retryAfter e sem retry automático", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return {
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "12" }),
      json: async () => ({}),
    };
  });

  try {
    await assert.rejects(buscarAgendaSemanal(), (erro) => {
      assert.equal(erro.servico, "AniList");
      assert.equal(erro.status, 429);
      assert.equal(erro.retryAfter, "12");
      return true;
    });
    assert.equal(chamadas, 1);
  } finally {
    restaurar();
    _resetProtecaoParaTestes();
  }
});

test("buscarAgendaSemanal: 500 tenta de novo uma vez e depois funciona", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    if (chamadas === 1) {
      return { ok: false, status: 500, headers: new Headers(), json: async () => ({}) };
    }
    return paginaAgenda({ schedules: [itemAgenda(101)] });
  });

  try {
    const resultado = await buscarAgendaSemanal();
    assert.equal(chamadas, 2);
    assert.equal(resultado.total, 1);
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: falha de rede vira ErroServicoExterno 504", async () => {
  const restaurar = mockFetch(async () => {
    throw new Error("ECONNRESET");
  });

  try {
    await assert.rejects(buscarAgendaSemanal(), (erro) => {
      assert.equal(erro.servico, "AniList");
      assert.equal(erro.status, 504);
      return true;
    });
  } finally {
    restaurar();
  }
});

test("buscarAgendaSemanal: corpo sem data vira ErroServicoExterno 502", async () => {
  const restaurar = mockFetch(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ errors: [{ message: "algo quebrou" }] }),
  }));

  try {
    await assert.rejects(buscarAgendaSemanal(), (erro) => {
      assert.equal(erro.status, 502);
      return true;
    });
  } finally {
    restaurar();
  }
});
