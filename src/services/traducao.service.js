import { obterDoCache, salvarNoCache } from "../utils/cache.js";
import { criarProtecaoExterna } from "../utils/protecaoExterna.js";

const TRADUCAO_API = "https://api.mymemory.translated.net/get";
const TAMANHO_MAXIMO_BLOCO = 480;

// tradução não muda, cache bem mais longo que o do MangaDex economiza cota
const TTL_CACHE_TRADUCAO = 24 * 60 * 60 * 1000;

// MyMemory só documenta cota diária por IP (aqui é 1 IP pra todo mundo).
// margem abaixo do que observei (~5000/dia)
const ORCAMENTO_DIARIO_CARACTERES = 4500;

const protecaoMyMemory = criarProtecaoExterna({ requisicoesPorSegundo: 2, tamanhoMaximoFila: 40 });

let diaDoOrcamento = new Date().toISOString().slice(0, 10);
let caracteresUsadosHoje = 0;

function reservarOrcamentoDiario(tamanho) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (hoje !== diaDoOrcamento) {
    diaDoOrcamento = hoje;
    caracteresUsadosHoje = 0;
  }

  if (caracteresUsadosHoje + tamanho > ORCAMENTO_DIARIO_CARACTERES) {
    return false;
  }

  caracteresUsadosHoje += tamanho;
  return true;
}

function dividirPorPalavras(frase) {
  const palavras = frase.split(" ");
  const blocos = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;
    if (candidato.length > TAMANHO_MAXIMO_BLOCO && atual) {
      blocos.push(atual);
      atual = palavra;
    } else {
      atual = candidato;
    }
  }
  if (atual) blocos.push(atual);
  return blocos;
}

function dividirEmBlocos(texto) {
  const frases = texto
    .split(/(?<=[.!?])\s+/)
    .flatMap((frase) => (frase.length > TAMANHO_MAXIMO_BLOCO ? dividirPorPalavras(frase) : [frase]));

  const blocos = [];
  let atual = "";

  for (const frase of frases) {
    const candidato = atual ? `${atual} ${frase}` : frase;
    if (candidato.length > TAMANHO_MAXIMO_BLOCO && atual) {
      blocos.push(atual);
      atual = frase;
    } else {
      atual = candidato;
    }
  }
  if (atual) blocos.push(atual);
  return blocos;
}

async function traduzirBlocoSemProtecao(bloco) {
  const url = `${TRADUCAO_API}?${new URLSearchParams({ q: bloco, langpair: "en|pt-BR" })}`;
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 8000);

  try {
    const resposta = await fetch(url, { signal: controlador.signal });
    if (!resposta.ok) return bloco;

    const dados = await resposta.json();

    if (dados.quotaFinished) {
      protecaoMyMemory.abrirCircuito(6 * 60 * 60 * 1000);
      return bloco;
    }

    return dados.responseData?.translatedText || bloco;
  } catch {
    return bloco;
  } finally {
    clearTimeout(limite);
  }
}

async function traduzirBloco(bloco) {
  const chaveCache = `traducao:${bloco}`;
  const emCache = obterDoCache(chaveCache);
  if (emCache) return emCache;

  if (!reservarOrcamentoDiario(bloco.length)) {
    return bloco;
  }

  try {
    const traduzido = await protecaoMyMemory.executar(() => traduzirBlocoSemProtecao(bloco));
    salvarNoCache(chaveCache, traduzido, TTL_CACHE_TRADUCAO);
    return traduzido;
  } catch {
    return bloco;
  }
}

export async function traduzirParaPortugues(texto) {
  if (!texto) return texto;

  const blocos = dividirEmBlocos(texto);
  const traduzidos = [];

  for (const bloco of blocos) {
    traduzidos.push(await traduzirBloco(bloco));
  }

  return traduzidos.join(" ");
}
