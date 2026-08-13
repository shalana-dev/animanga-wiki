import {
  pesquisarMangas,
  buscarColecaoInicial,
  buscarMangaPorId,
  buscarCapitulos,
  ErroMangaDex,
  ErroCircuitoAberto,
  ErroFilaCheia,
} from "../services/mangadex.service.js";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGEX_IDIOMA = /^[a-z]{2,3}(-[a-z]{2})?$/i;
const TAMANHO_MINIMO_TITULO = 2;
const TAMANHO_MAXIMO_TITULO = 100;
const PAGINA_MAXIMA = 500;

function tratarErroDeApi(res, erro, mensagemPadrao) {
  if (erro instanceof ErroCircuitoAberto) {
    res.set("Retry-After", String(erro.tentarNovamenteEm));
    return res.status(503).json({
      erro: "Esse serviço externo está pausado por alguns instantes após um limite ser atingido. Tente novamente em breve.",
      retryAfter: erro.tentarNovamenteEm,
    });
  }

  if (erro instanceof ErroFilaCheia) {
    return res.status(503).json({
      erro: "O servidor está com muitas requisições pendentes agora. Tente novamente em instantes.",
    });
  }

  if (erro instanceof ErroMangaDex) {
    if (erro.status === 429) {
      const retryAfter = erro.retryAfter || "5";
      res.set("Retry-After", retryAfter);
      return res.status(429).json({
        erro: "O MangaDex recebeu muitas requisições agora. Tente novamente em alguns segundos.",
        retryAfter,
      });
    }

    if (erro.status === 504) {
      return res.status(504).json({ erro: "O MangaDex demorou demais para responder." });
    }
  }

  console.error(erro);
  return res.status(502).json({ erro: mensagemPadrao });
}

export async function buscarMangas(req, res) {
  const titulo = (req.query.titulo || "").trim();

  if (titulo.length < TAMANHO_MINIMO_TITULO) {
    return res.status(400).json({
      erro: `Digite pelo menos ${TAMANHO_MINIMO_TITULO} caracteres para buscar.`,
    });
  }

  if (titulo.length > TAMANHO_MAXIMO_TITULO) {
    return res.status(400).json({
      erro: `O termo de busca pode ter no máximo ${TAMANHO_MAXIMO_TITULO} caracteres.`,
    });
  }

  try {
    const resultado = await pesquisarMangas(titulo);
    res.json(resultado);
  } catch (erro) {
    tratarErroDeApi(res, erro, "Não foi possível consultar o MangaDex agora.");
  }
}

export async function obterColecaoInicial(req, res) {
  try {
    const resultado = await buscarColecaoInicial();
    res.json(resultado);
  } catch (erro) {
    tratarErroDeApi(res, erro, "Não foi possível carregar a biblioteca de mangás agora.");
  }
}

export async function obterManga(req, res) {
  const { id } = req.params;

  if (!REGEX_UUID.test(id)) {
    return res.status(400).json({ erro: "Identificador de mangá inválido." });
  }

  try {
    const resultado = await buscarMangaPorId(id);
    res.json(resultado);
  } catch (erro) {
    tratarErroDeApi(res, erro, "Não foi possível consultar o MangaDex agora.");
  }
}

export async function obterCapitulos(req, res) {
  const { id } = req.params;
  const idioma = req.query.idioma || "pt-br";
  const pagina = Number.parseInt(req.query.pagina, 10) || 1;

  if (!REGEX_UUID.test(id)) {
    return res.status(400).json({ erro: "Identificador de mangá inválido." });
  }

  if (!REGEX_IDIOMA.test(idioma)) {
    return res.status(400).json({ erro: "Código de idioma inválido." });
  }

  if (pagina < 1 || pagina > PAGINA_MAXIMA) {
    return res.status(400).json({ erro: `A página deve estar entre 1 e ${PAGINA_MAXIMA}.` });
  }

  try {
    const resultado = await buscarCapitulos(id, { idioma, pagina });
    res.json(resultado);
  } catch (erro) {
    tratarErroDeApi(res, erro, "Não foi possível consultar os capítulos agora.");
  }
}
