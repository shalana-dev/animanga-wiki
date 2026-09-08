import { ErroCircuitoAberto, ErroFilaCheia } from "./protecaoExterna.js";

export class ErroServicoExterno extends Error {
  constructor(servico, status, retryAfter = null) {
    super(`${servico} respondeu ${status}`);
    this.servico = servico;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// traduz um erro de serviço externo (ou da fila/circuito de proteção) numa
// resposta HTTP. mesma ideia do tratarErroDeApi() do controller de mangás,
// só que genérico para qualquer serviço
export function responderErroExterno(res, erro, mensagemPadrao) {
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

  if (erro instanceof ErroServicoExterno) {
    if (erro.status === 429) {
      const retryAfter = erro.retryAfter || "5";
      res.set("Retry-After", retryAfter);
      return res.status(429).json({
        erro: `O ${erro.servico} recebeu muitas requisições agora. Tente novamente em alguns segundos.`,
        retryAfter,
      });
    }

    if (erro.status === 504) {
      return res.status(504).json({ erro: `O ${erro.servico} demorou demais para responder.` });
    }
  }

  console.error(erro);
  return res.status(502).json({ erro: mensagemPadrao });
}
