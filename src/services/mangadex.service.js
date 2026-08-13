import { comRequisicaoCompartilhada } from "../utils/cache.js";
import { criarProtecaoExterna, ErroCircuitoAberto, ErroFilaCheia } from "../utils/protecaoExterna.js";
import { traduzirParaPortugues } from "./traducao.service.js";

const MANGADEX_API = "https://api.mangadex.org";

// MangaDex libera ~5 req/s por IP, mas isso é dividido entre todo mundo do
// site ao mesmo tempo. fico abaixo de propósito pra não tomar ban
const protecaoMangaDex = criarProtecaoExterna({ requisicoesPorSegundo: 3, tamanhoMaximoFila: 40 });

// amostra editorial fixa pra Biblioteca não ficar vazia antes da busca.
// não é ranking, IDs conferidos direto no MangaDex
export const COLECAO_INICIAL_IDS = [
  "a1c7c817-4e59-43b7-9365-09675a149a6f", // One Piece
  "6b1eb93e-473a-4ab3-9922-1a66d2a29a4a", // Naruto
  "801513ba-a712-498c-8f57-cae55b38cc92", // Berserk
  "75ee72ab-c6bf-4b87-badd-de839156934c", // Death Note
  "304ceac3-8cdb-4fe7-acf7-2b6ff7a60613", // Attack on Titan
  "789642f8-ca89-4e4e-8f7b-eee4d17ea08b", // Demon Slayer: Kimetsu no Yaiba
  "c52b2ce3-7f95-469c-96b0-479524fb7a1a", // Jujutsu Kaisen
  "a77742b1-befd-49a4-bff5-1ad4e6b0ef7b", // Chainsaw Man
  "40bc649f-7b49-4645-859e-6cd94136e722", // Dragon Ball
  "239d6260-d71f-43b0-afff-074e3619e3de", // Bleach
  "dd8a907a-3850-4f95-ba03-ba201a8399e3", // Fullmetal Alchemist
  "db692d58-4b13-4174-ae8c-30c515c0689c", // Hunter x Hunter
  "5a547d1d-576b-477f-8cb3-70a3b4187f8a", // JoJo's Bizarre Adventure (Part 1: Phantom Blood)
  "d1a9fdeb-f713-407f-960c-8326b586e6fd", // Vagabond
  "5d1fc77e-706a-4fc5-bea8-486c9be0145d", // Vinland Saga
  "6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b", // Tokyo Ghoul
  "4f3bcae4-2d96-4c9d-932c-90181d9c873e", // My Hero Academia
  "d8a959f7-648e-4c8d-8f23-f1f3f8e129f3", // One-Punch Man
  "e39944f5-15bf-4464-9556-a4e9b3945571", // Sailor Moon
  "6b958848-c885-4735-9201-12ee77abcb3c", // Spy x Family
];

// esses títulos não têm "en" no MangaDex (cairia pra "Toukyou Ghoul" etc).
// troco só aqui pelo nome mais conhecido, sem tocar em normalizarManga()
const TITULOS_PREFERIDOS_COLECAO = new Map([
  ["6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b", "Tokyo Ghoul"],
  ["4f3bcae4-2d96-4c9d-932c-90181d9c873e", "My Hero Academia"],
  ["e39944f5-15bf-4464-9556-a4e9b3945571", "Sailor Moon"],
  ["5a547d1d-576b-477f-8cb3-70a3b4187f8a", "JoJo's Bizarre Adventure"],
  ["d8a959f7-648e-4c8d-8f23-f1f3f8e129f3", "One-Punch Man"],
]);

export { ErroCircuitoAberto, ErroFilaCheia };
export function _resetProtecaoParaTestes() {
  protecaoMangaDex.resetar();
}

export class ErroMangaDex extends Error {
  constructor(status, retryAfter = null) {
    super(`MangaDex respondeu ${status}`);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function encontrarCapa(manga) {
  const capa = manga.relationships.find((rel) => rel.type === "cover_art");
  if (!capa) return null;
  return `https://uploads.mangadex.org/covers/${manga.id}/${capa.attributes.fileName}.256.jpg`;
}

async function normalizarManga(manga, { traduzir = false } = {}) {
  const { attributes } = manga;
  const jaEstaEmPortugues = Boolean(attributes.description["pt-br"]);
  const descricaoOriginal =
    attributes.description["pt-br"] ||
    attributes.description.en ||
    Object.values(attributes.description)[0] ||
    "";

  const descricao =
    traduzir && !jaEstaEmPortugues
      ? await traduzirParaPortugues(descricaoOriginal)
      : descricaoOriginal;

  return {
    id: manga.id,
    titulo: attributes.title.en || Object.values(attributes.title)[0],
    descricao,
    status: attributes.status,
    ano: attributes.year,
    tags: attributes.tags.map((tag) => tag.attributes.name.en),
    capa: encontrarCapa(manga),
  };
}

function normalizarCapitulo(capitulo) {
  const grupo = capitulo.relationships.find((rel) => rel.type === "scanlation_group");

  return {
    id: capitulo.id,
    capitulo: capitulo.attributes.chapter,
    volume: capitulo.attributes.volume,
    titulo: capitulo.attributes.title,
    data: capitulo.attributes.publishAt,
    idioma: capitulo.attributes.translatedLanguage,
    grupo: grupo?.attributes?.name || "Grupo desconhecido",
    link: `https://mangadex.org/chapter/${capitulo.id}`,
  };
}

async function requisitarSemProtecao(url, jaTentouNovamente = false) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 8000);

  let resposta;
  try {
    resposta = await fetch(url, { signal: controlador.signal });
  } catch {
    throw new ErroMangaDex(504);
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 429) {
    const retryAfter = resposta.headers.get("retry-after");
    protecaoMangaDex.abrirCircuito((Number(retryAfter) || 10) * 1000);
    throw new ErroMangaDex(429, retryAfter);
  }

  if (resposta.status >= 500 && !jaTentouNovamente) {
    await new Promise((resolver) => setTimeout(resolver, 400));
    return requisitarSemProtecao(url, true);
  }

  if (!resposta.ok) {
    throw new ErroMangaDex(resposta.status);
  }

  return resposta.json();
}

function requisitar(url) {
  return protecaoMangaDex.executar(() => requisitarSemProtecao(url));
}

export async function pesquisarMangas(titulo) {
  const chave = `busca:${titulo.trim().toLowerCase()}`;

  return comRequisicaoCompartilhada(chave, async () => {
    const url = `${MANGADEX_API}/manga?title=${encodeURIComponent(titulo)}&includes[]=cover_art`;
    const dados = await requisitar(url);

    return {
      total: dados.total,
      resultados: await Promise.all(dados.data.map((manga) => normalizarManga(manga))),
    };
  });
}

export async function buscarColecaoInicial() {
  const chave = "colecao-inicial";

  return comRequisicaoCompartilhada(chave, async () => {
    const parametrosIds = COLECAO_INICIAL_IDS.map((id) => `ids[]=${id}`).join("&");
    const url = `${MANGADEX_API}/manga?${parametrosIds}&limit=${COLECAO_INICIAL_IDS.length}&includes[]=cover_art`;
    const dados = await requisitar(url);

    const normalizados = await Promise.all(dados.data.map((manga) => normalizarManga(manga)));
    const comTituloPreferido = normalizados.map((manga) =>
      TITULOS_PREFERIDOS_COLECAO.has(manga.id)
        ? { ...manga, titulo: TITULOS_PREFERIDOS_COLECAO.get(manga.id) }
        : manga,
    );
    const normalizadosPorId = new Map(comTituloPreferido.map((manga) => [manga.id, manga]));

    // ids[] do MangaDex não preserva ordem, então remonto na ordem editorial.
    // título indisponível só some do Map, sem travar o resto
    return {
      total: normalizados.length,
      resultados: COLECAO_INICIAL_IDS.map((id) => normalizadosPorId.get(id)).filter(Boolean),
    };
  });
}

export async function buscarMangaPorId(id) {
  const chave = `manga:${id}`;

  return comRequisicaoCompartilhada(chave, async () => {
    const url = `${MANGADEX_API}/manga/${id}?includes[]=cover_art`;
    const dados = await requisitar(url);
    return normalizarManga(dados.data, { traduzir: true });
  });
}

export async function buscarCapitulos(id, { idioma = "pt-br", pagina = 1 } = {}) {
  const limitePorPagina = 20;
  const offset = (pagina - 1) * limitePorPagina;
  const chave = `capitulos:${id}:${idioma}:${pagina}`;

  return comRequisicaoCompartilhada(chave, async () => {
    const url =
      `${MANGADEX_API}/manga/${id}/feed?translatedLanguage[]=${encodeURIComponent(idioma)}` +
      `&order[chapter]=asc&limit=${limitePorPagina}&offset=${offset}&includes[]=scanlation_group`;
    const dados = await requisitar(url);

    return {
      total: dados.total,
      capitulos: dados.data.map(normalizarCapitulo),
    };
  });
}
