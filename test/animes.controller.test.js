import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { obterCalendario, obterDestaques } from "../src/controllers/animes.controller.js";
import { _limparCache } from "../src/utils/cache.js";
import { _resetProtecaoParaTestes as resetAniList } from "../src/services/anilist.service.js";
import { _resetProtecaoParaTestes as resetJikan } from "../src/services/jikan.service.js";

beforeEach(() => {
  _limparCache();
  resetAniList();
  resetJikan();
});

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

// roteia o fetch simulado pela URL: AniList é POST em graphql.anilist.co,
// Jikan é GET em api.jikan.moe
function mockFetch({ anilist, jikan }) {
  const original = global.fetch;
  global.fetch = async (url, opcoes) => {
    const alvo = String(url);
    if (alvo.includes("graphql.anilist.co")) return anilist(url, opcoes);
    if (alvo.includes("api.jikan.moe")) return jikan(url, opcoes);
    throw new Error(`URL inesperada no teste: ${alvo}`);
  };
  return () => {
    global.fetch = original;
  };
}

function paginaAniList(schedules) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      data: { Page: { pageInfo: { hasNextPage: false }, airingSchedules: schedules } },
    }),
  };
}

function itemAniList(idMal) {
  return {
    airingAt: 1_700_000_000,
    episode: 3,
    media: {
      id: idMal + 1000,
      idMal,
      siteUrl: `https://anilist.co/anime/${idMal}`,
      title: { romaji: `Anime ${idMal}`, english: `Anime ${idMal}` },
      coverImage: { extraLarge: `https://s4.anilist.co/${idMal}.jpg`, large: null },
    },
  };
}

function listaJikan(data) {
  return { ok: true, status: 200, headers: new Headers(), json: async () => ({ data }) };
}

test("obterCalendario: AniList respondendo → fonte anilist", async () => {
  const restaurar = mockFetch({
    anilist: async () => paginaAniList([itemAniList(101), itemAniList(102)]),
    jikan: async () => {
      throw new Error("não deveria chamar a Jikan");
    },
  });

  try {
    const res = resFalso();
    await obterCalendario({}, res);
    assert.equal(res.codigoStatus, 200);
    assert.equal(res.corpo.fonte, "anilist");
    assert.equal(res.corpo.total, 2);
  } finally {
    restaurar();
  }
});

test("obterCalendario: AniList fora do ar → cai para a programação da Jikan", async () => {
  const restaurar = mockFetch({
    anilist: async () => {
      throw new Error("ECONNRESET");
    },
    jikan: async () =>
      listaJikan([
        {
          mal_id: 55,
          title: "Anime 55",
          title_english: "Anime 55",
          url: "https://myanimelist.net/anime/55",
          broadcast: { day: "Fridays", time: "22:00" },
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/55.jpg" } },
        },
      ]),
  });

  try {
    const res = resFalso();
    await obterCalendario({}, res);
    assert.equal(res.codigoStatus, 200);
    assert.equal(res.corpo.fonte, "jikan");
    assert.equal(res.corpo.resultados[0].dia, "sexta");
  } finally {
    restaurar();
  }
});

test("obterCalendario: AniList e Jikan fora do ar → 504 com mensagem de erro", async () => {
  const restaurar = mockFetch({
    anilist: async () => {
      throw new Error("ECONNRESET");
    },
    jikan: async () => {
      throw new Error("MyAnimeList may be down");
    },
  });

  try {
    const res = resFalso();
    await obterCalendario({}, res);
    assert.equal(res.codigoStatus, 504);
    assert.ok(res.corpo.erro);
  } finally {
    restaurar();
  }
});

test("obterDestaques: Jikan respondendo → 200 com resultados", async () => {
  const restaurar = mockFetch({
    anilist: async () => {
      throw new Error("não deveria chamar a AniList");
    },
    jikan: async () =>
      listaJikan([
        {
          mal_id: 7,
          title: "Destaque 7",
          type: "TV",
          status: "Currently Airing",
          score: 8.4,
          synopsis: "...",
          url: "https://myanimelist.net/anime/7",
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/7.jpg" } },
        },
      ]),
  });

  try {
    const res = resFalso();
    await obterDestaques({}, res);
    assert.equal(res.codigoStatus, 200);
    assert.equal(res.corpo.total, 1);
    assert.equal(res.corpo.resultados[0].mal_id, 7);
  } finally {
    restaurar();
  }
});

test("obterDestaques: Jikan em 429 → 429 com Retry-After", async () => {
  const restaurar = mockFetch({
    anilist: async () => {
      throw new Error("não deveria chamar a AniList");
    },
    jikan: async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "9" }),
      json: async () => ({}),
    }),
  });

  try {
    const res = resFalso();
    await obterDestaques({}, res);
    assert.equal(res.codigoStatus, 429);
    assert.equal(res.headers["Retry-After"], "9");
  } finally {
    restaurar();
    resetJikan();
  }
});
