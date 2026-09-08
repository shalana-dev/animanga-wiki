const armazenamento = new Map();
const TTL_PADRAO = 5 * 60 * 1000;
const TAMANHO_MAXIMO = 500;

export function obterDoCache(chave) {
  const item = armazenamento.get(chave);
  if (!item) return null;

  if (Date.now() > item.expiraEm) {
    armazenamento.delete(chave);
    return null;
  }

  return item.valor;
}

export function salvarNoCache(chave, valor, ttlMs = TTL_PADRAO) {
  if (armazenamento.size >= TAMANHO_MAXIMO && !armazenamento.has(chave)) {
    const chaveMaisAntiga = armazenamento.keys().next().value;
    armazenamento.delete(chaveMaisAntiga);
  }

  armazenamento.set(chave, {
    valor,
    expiraEm: Date.now() + ttlMs,
  });
}

const requisicoesEmAndamento = new Map();

export async function comRequisicaoCompartilhada(chave, executar, ttlMs = TTL_PADRAO) {
  const emCache = obterDoCache(chave);
  if (emCache) return emCache;

  if (requisicoesEmAndamento.has(chave)) {
    return requisicoesEmAndamento.get(chave);
  }

  const promessa = executar()
    .then((resultado) => {
      salvarNoCache(chave, resultado, ttlMs);
      return resultado;
    })
    .finally(() => {
      requisicoesEmAndamento.delete(chave);
    });

  requisicoesEmAndamento.set(chave, promessa);
  return promessa;
}

// última resposta boa por chave, sem expiração própria: só é usada quando a
// chamada nova falha. sobrescrita a cada sucesso
const ultimasRespostasBoas = new Map();

// igual a comRequisicaoCompartilhada, mas se executar() falhar e já existir uma
// resposta boa anterior para essa chave, devolve essa resposta marcada com
// obsoleto: true em vez de propagar o erro. para dados em que é melhor mostrar
// algo velho do que sumir com a seção (calendário, destaques). o resultado de
// executar() precisa ser um objeto (fica com spread aqui).
export async function comRespostaDeReserva(chave, executar, ttlMs = TTL_PADRAO) {
  try {
    const resultado = await comRequisicaoCompartilhada(chave, executar, ttlMs);
    ultimasRespostasBoas.set(chave, resultado);
    return resultado;
  } catch (erro) {
    const reserva = ultimasRespostasBoas.get(chave);
    if (reserva === undefined) throw erro;
    return { ...reserva, obsoleto: true };
  }
}

// só para os testes: zera o estado de módulo entre casos
export function _limparCache() {
  armazenamento.clear();
  requisicoesEmAndamento.clear();
  ultimasRespostasBoas.clear();
}
