import { comRespostaDeReserva } from "../utils/cache.js";
import { criarProtecaoExterna } from "../utils/protecaoExterna.js";
import { ErroServicoExterno } from "../utils/erroExterno.js";

const ANILIST_API = "https://graphql.anilist.co";

// AniList libera ~90 req/min por IP (e já operou a 30/min em fases de
// instabilidade). com o cache aqui do lado do servidor, o site inteiro gera
// só algumas chamadas por janela, então esse teto baixo sobra
const protecaoAniList = criarProtecaoExterna({ requisicoesPorSegundo: 1, tamanhoMaximoFila: 20 });

const TTL_AGENDA = 15 * 60 * 1000;
const MAXIMO_PAGINAS = 4;

export function _resetProtecaoParaTestes() {
  protecaoAniList.resetar();
}

const CONSULTA_AGENDA = `
  query AgendaSemanal($inicio: Int, $fim: Int, $pagina: Int) {
    Page(page: $pagina, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $inicio, airingAt_lesser: $fim, sort: TIME) {
        airingAt
        episode
        media {
          id
          idMal
          siteUrl
          title { romaji english }
          coverImage { extraLarge large }
        }
      }
    }
  }
`;

async function consultar(query, variables, jaTentouNovamente = false) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 10000);

  let resposta;
  try {
    resposta = await fetch(ANILIST_API, {
      method: "POST",
      signal: controlador.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AnimangaWiki/1.0 (+https://animanga-wiki.onrender.com)",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new ErroServicoExterno("AniList", 504);
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 429) {
    const retryAfter = resposta.headers.get("retry-after");
    protecaoAniList.abrirCircuito((Number(retryAfter) || 30) * 1000);
    throw new ErroServicoExterno("AniList", 429, retryAfter);
  }

  if (resposta.status >= 500 && !jaTentouNovamente) {
    await new Promise((resolver) => setTimeout(resolver, 500));
    return consultar(query, variables, true);
  }

  if (!resposta.ok) {
    throw new ErroServicoExterno("AniList", resposta.status);
  }

  const corpo = await resposta.json().catch(() => null);
  if (!corpo?.data) {
    throw new ErroServicoExterno("AniList", 502);
  }
  return corpo.data;
}

function requisitar(query, variables) {
  return protecaoAniList.executar(() => consultar(query, variables));
}

// NFD + strip de tudo que não é [a-z0-9] deixa a chave tolerante a acento,
// caixa e pontuação (o combining mark do "é" cai no strip final)
function chaveTitulo(item) {
  return (item.title_english || item.title || "")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function removerRepetidos(itens) {
  const ids = new Set();
  const titulos = new Set();
  return itens.filter((item) => {
    const titulo = chaveTitulo(item);
    if (ids.has(item.mal_id) || (titulo && titulos.has(titulo))) return false;
    ids.add(item.mal_id);
    if (titulo) titulos.add(titulo);
    return true;
  });
}

function normalizarItem(item) {
  const media = item.media || {};
  return {
    mal_id: media.idMal || media.id,
    title: media.title?.english || media.title?.romaji || "Sem título",
    title_english: media.title?.english || null,
    url: media.siteUrl || null,
    // Unix em segundos: quem converte para o fuso de quem acessa é o navegador
    airingAt: item.airingAt,
    dia: null,
    horarioJST: null,
    episodio: item.episode || null,
    imagemAlta: media.coverImage?.extraLarge || media.coverImage?.large || "",
  };
}

export async function buscarAgendaSemanal() {
  return comRespostaDeReserva(
    "calendario:anilist",
    async () => {
      // janela de 8 dias a partir da meia-noite UTC de ontem: a margem cobre o
      // "hoje" de qualquer fuso, e a deduplicação por mal_id descarta um mesmo
      // título que apareça duas vezes (esta semana e a próxima)
      const base = new Date();
      base.setUTCHours(0, 0, 0, 0);
      base.setUTCDate(base.getUTCDate() - 1);
      const inicio = Math.floor(base.getTime() / 1000);
      const fim = inicio + 8 * 24 * 60 * 60;

      const agenda = [];
      for (let pagina = 1; pagina <= MAXIMO_PAGINAS; pagina += 1) {
        const dados = await requisitar(CONSULTA_AGENDA, { inicio, fim, pagina });
        const itens = dados?.Page?.airingSchedules;
        if (!Array.isArray(itens)) throw new ErroServicoExterno("AniList", 502);
        agenda.push(...itens);
        if (!dados.Page.pageInfo?.hasNextPage) break;
      }

      const resultados = removerRepetidos(agenda.map(normalizarItem));
      return { total: resultados.length, resultados };
    },
    TTL_AGENDA,
  );
}
