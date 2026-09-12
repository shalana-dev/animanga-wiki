import { comRespostaDeReserva } from "../utils/cache.js";
import { criarProtecaoExterna } from "../utils/protecaoExterna.js";
import { ErroServicoExterno } from "../utils/erroExterno.js";

const JIKAN_API = "https://api.jikan.moe/v4";

// Jikan documenta ~3 req/s e 60/min por IP; fico abaixo porque esse teto é
// dividido entre todos os visitantes ao mesmo tempo
const protecaoJikan = criarProtecaoExterna({ requisicoesPorSegundo: 1, tamanhoMaximoFila: 20 });

const TTL_DESTAQUES = 30 * 60 * 1000;
const TTL_AGENDA = 15 * 60 * 1000;

const DIAS_JIKAN = {
  Mondays: "segunda",
  Tuesdays: "terca",
  Wednesdays: "quarta",
  Thursdays: "quinta",
  Fridays: "sexta",
  Saturdays: "sabado",
  Sundays: "domingo",
};

export function _resetProtecaoParaTestes() {
  protecaoJikan.resetar();
}

async function consultar(caminho, jaTentouNovamente = false) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 10000);

  let resposta;
  try {
    resposta = await fetch(`${JIKAN_API}${caminho}`, {
      signal: controlador.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AnimangaWiki/1.0 (+https://animanga-wiki.onrender.com)",
      },
    });
  } catch (erro) {
    console.error("Jikan fetch falhou:", erro);
    throw new ErroServicoExterno("Jikan", 504);
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 429) {
    const retryAfter = resposta.headers.get("retry-after");
    protecaoJikan.abrirCircuito((Number(retryAfter) || 10) * 1000);
    throw new ErroServicoExterno("Jikan", 429, retryAfter);
  }

  if (resposta.status >= 500 && !jaTentouNovamente) {
    await new Promise((resolver) => setTimeout(resolver, 500));
    return consultar(caminho, true);
  }

  if (!resposta.ok) {
    throw new ErroServicoExterno("Jikan", resposta.status);
  }

  const corpo = await resposta.json().catch(() => null);
  if (!Array.isArray(corpo?.data)) {
    throw new ErroServicoExterno("Jikan", 502);
  }
  return corpo.data;
}

function requisitar(caminho) {
  return protecaoJikan.executar(() => consultar(caminho));
}

function capaDe(anime) {
  return (
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.image_url ||
    anime.images?.jpg?.image_url ||
    ""
  );
}

function chaveTitulo(texto = "") {
  return texto
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function removerRepetidos(itens) {
  const ids = new Set();
  const titulos = new Set();
  return itens.filter((item) => {
    const titulo = chaveTitulo(item.title_english || item.title || "");
    if (ids.has(item.mal_id) || (titulo && titulos.has(titulo))) return false;
    ids.add(item.mal_id);
    if (titulo) titulos.add(titulo);
    return true;
  });
}

function removerCapasRepetidas(itens) {
  const capas = new Set();
  return itens.filter((item) => {
    const chave = (item.imagemAlta || "").split("?")[0];
    if (chave && capas.has(chave)) return false;
    if (chave) capas.add(chave);
    return true;
  });
}

function normalizarDestaque(anime) {
  return {
    mal_id: anime.mal_id,
    title: anime.title || anime.title_english || "Sem título",
    title_english: anime.title_english || null,
    type: anime.type || "Anime",
    status: anime.status || null,
    score: typeof anime.score === "number" ? anime.score : null,
    synopsis: anime.synopsis || null,
    url: anime.url || null,
    imagemAlta: capaDe(anime),
  };
}

export async function buscarDestaquesTemporada() {
  return comRespostaDeReserva(
    "destaques:jikan",
    async () => {
      const dados = await requisitar("/seasons/now?limit=15");
      const ordenados = dados
        .filter((anime) => capaDe(anime))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map(normalizarDestaque);
      const resultados = removerCapasRepetidas(removerRepetidos(ordenados));
      return { total: resultados.length, resultados };
    },
    TTL_DESTAQUES,
  );
}

export async function buscarAgendaSemanal() {
  return comRespostaDeReserva(
    "calendario:jikan",
    async () => {
      const dados = await requisitar("/schedules?limit=25");
      const itens = dados
        .filter((anime) => DIAS_JIKAN[anime.broadcast?.day])
        .map((anime) => ({
          mal_id: anime.mal_id,
          title: anime.title || anime.title_english || "Sem título",
          title_english: anime.title_english || null,
          url: anime.url || null,
          airingAt: null, // Jikan não dá timestamp exato de exibição
          dia: DIAS_JIKAN[anime.broadcast.day],
          horarioJST: anime.broadcast?.time || null,
          episodio: null,
          imagemAlta: capaDe(anime),
        }));
      const resultados = removerRepetidos(itens);
      return { total: resultados.length, resultados };
    },
    TTL_AGENDA,
  );
}
