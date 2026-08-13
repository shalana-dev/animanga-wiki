import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pesquisarMangas,
  buscarColecaoInicial,
  buscarMangaPorId,
  buscarCapitulos,
  ErroMangaDex,
  COLECAO_INICIAL_IDS,
  _resetProtecaoParaTestes,
} from "../src/services/mangadex.service.js";

function respostaFalsaManga(titulo) {
  return {
    total: 1,
    data: [
      {
        id: "801513ba-a712-498c-8f57-cae55b38cc02",
        relationships: [
          { type: "cover_art", attributes: { fileName: "capa.jpg" } },
        ],
        attributes: {
          title: { en: titulo },
          description: { en: "Descrição de teste em inglês." },
          status: "ongoing",
          year: 2020,
          tags: [{ attributes: { name: { en: "Ação" } } }],
        },
      },
    ],
  };
}

function mockFetch(implementacao) {
  const original = global.fetch;
  global.fetch = implementacao;
  return () => {
    global.fetch = original;
  };
}

test("pesquisarMangas: resposta normal é normalizada", async () => {
  const restaurar = mockFetch(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => respostaFalsaManga("Manga De Teste"),
  }));

  try {
    const resultado = await pesquisarMangas("manga de teste unico 1");
    assert.equal(resultado.total, 1);
    assert.equal(resultado.resultados[0].titulo, "Manga De Teste");
    assert.equal(resultado.resultados[0].capa, "https://uploads.mangadex.org/covers/801513ba-a712-498c-8f57-cae55b38cc02/capa.jpg.256.jpg");
  } finally {
    restaurar();
  }
});

test("pesquisarMangas: 429 lança ErroMangaDex com retryAfter, sem tentar de novo", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return {
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "7" }),
      json: async () => ({}),
    };
  });

  try {
    await assert.rejects(
      () => pesquisarMangas("termo unico 429"),
      (erro) => {
        assert.ok(erro instanceof ErroMangaDex);
        assert.equal(erro.status, 429);
        assert.equal(erro.retryAfter, "7");
        return true;
      },
    );
    assert.equal(chamadas, 1, "não deveria tentar de novo automaticamente em 429");
  } finally {
    restaurar();
    _resetProtecaoParaTestes();
  }
});

test("pesquisarMangas: 500 tenta de novo uma vez e depois funciona", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    if (chamadas === 1) {
      return { ok: false, status: 500, headers: new Headers(), json: async () => ({}) };
    }
    return { ok: true, status: 200, headers: new Headers(), json: async () => respostaFalsaManga("Recuperado") };
  });

  try {
    const resultado = await pesquisarMangas("termo unico recuperado");
    assert.equal(chamadas, 2);
    assert.equal(resultado.resultados[0].titulo, "Recuperado");
  } finally {
    restaurar();
  }
});

test("pesquisarMangas: 500 persistente falha depois de só 1 tentativa extra (sem retry infinito)", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    return { ok: false, status: 503, headers: new Headers(), json: async () => ({}) };
  });

  try {
    await assert.rejects(() => pesquisarMangas("termo unico persistente 503"));
    assert.equal(chamadas, 2, "deve tentar no máximo 2 vezes (1 original + 1 retry)");
  } finally {
    restaurar();
  }
});

test("pesquisarMangas: timeout (AbortError) vira ErroMangaDex 504", async () => {
  const restaurar = mockFetch(async (url, opcoes) => {
    return new Promise((resolve, reject) => {
      opcoes.signal.addEventListener("abort", () => {
        const erro = new Error("abortado");
        erro.name = "AbortError";
        reject(erro);
      });
    });
  });

  try {
    await assert.rejects(
      () => pesquisarMangas("termo unico timeout"),
      (erro) => {
        assert.ok(erro instanceof ErroMangaDex);
        assert.equal(erro.status, 504);
        return true;
      },
    );
  } finally {
    restaurar();
  }
}, { timeout: 10000 });

test("buscarCapitulos: idioma é codificado na URL (sem injeção de query string)", async () => {
  let urlChamada = "";
  const restaurar = mockFetch(async (url) => {
    urlChamada = url;
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ total: 0, data: [] }),
    };
  });

  try {
    await buscarCapitulos("801513ba-a712-498c-8f57-cae55b38cc02", { idioma: "pt-br&hack=1", pagina: 1 });
    assert.ok(urlChamada.includes("translatedLanguage[]=pt-br%26hack%3D1"));
    assert.ok(!urlChamada.includes("&hack=1"));
  } finally {
    restaurar();
  }
});

test("buscarMangaPorId: resultados idênticos simultâneos compartilham uma única chamada", async () => {
  let chamadas = 0;
  const restaurar = mockFetch(async () => {
    chamadas += 1;
    await new Promise((r) => setTimeout(r, 15));
    const manga = respostaFalsaManga("Simultaneo").data[0];
    manga.attributes.description["pt-br"] = "Já em português, não deveria chamar tradução.";
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: manga }),
    };
  });

  try {
    const idUnico = "111113ba-a712-498c-8f57-cae55b38cc99";
    const [a, b] = await Promise.all([buscarMangaPorId(idUnico), buscarMangaPorId(idUnico)]);
    assert.equal(chamadas, 1);
    assert.deepEqual(a, b);
  } finally {
    restaurar();
  }
});

function mangaFalsoPorId(id, titulo) {
  return {
    id,
    relationships: [{ type: "cover_art", attributes: { fileName: "capa.jpg" } }],
    attributes: {
      title: { en: titulo },
      description: { en: "Descrição de teste em inglês." },
      status: "ongoing",
      year: 2020,
      tags: [{ attributes: { name: { en: "Ação" } } }],
    },
  };
}

test("COLECAO_INICIAL_IDS: tem 20 títulos e Dragon Ball na nona posição", () => {
  assert.equal(COLECAO_INICIAL_IDS.length, 20);
  assert.equal(COLECAO_INICIAL_IDS[8], "40bc649f-7b49-4645-859e-6cd94136e722");
});

test("buscarColecaoInicial: mantém a ordem editorial, tolera título indisponível e usa o título preferido", async () => {
  // mock já vem embaralhado e sem o índice 2, pra testar as duas garantias
  // numa chamada só (de novo bateria no cache em vez de simular resposta nova)
  const idsDisponiveis = COLECAO_INICIAL_IDS.filter((_, indice) => indice !== 2);
  const restaurar = mockFetch(async () => {
    const embaralhado = [...idsDisponiveis].reverse();
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        data: embaralhado.map((id, indice) => mangaFalsoPorId(id, `Titulo ${indice}`)),
      }),
    };
  });

  try {
    const resultado = await buscarColecaoInicial();

    assert.deepEqual(
      resultado.resultados.map((manga) => manga.id),
      idsDisponiveis,
    );

    const tokyoGhoul = resultado.resultados.find(
      (manga) => manga.id === "6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b",
    );
    assert.equal(
      tokyoGhoul.titulo,
      "Tokyo Ghoul",
      "deve sobrepor o título com o nome preferido, mesmo quando a API (simulada) devolve outro",
    );
  } finally {
    restaurar();
  }
});
