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

export async function comRequisicaoCompartilhada(chave, executar) {
  const emCache = obterDoCache(chave);
  if (emCache) return emCache;

  if (requisicoesEmAndamento.has(chave)) {
    return requisicoesEmAndamento.get(chave);
  }

  const promessa = executar()
    .then((resultado) => {
      salvarNoCache(chave, resultado);
      return resultado;
    })
    .finally(() => {
      requisicoesEmAndamento.delete(chave);
    });

  requisicoesEmAndamento.set(chave, promessa);
  return promessa;
}
