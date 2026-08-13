export class ErroCircuitoAberto extends Error {
  constructor(tentarNovamenteEm) {
    super("Serviço externo temporariamente pausado após limite excedido.");
    this.tentarNovamenteEm = tentarNovamenteEm;
  }
}

export class ErroFilaCheia extends Error {
  constructor() {
    super("Muitas requisições pendentes para este serviço externo.");
  }
}

export function criarProtecaoExterna({ requisicoesPorSegundo, tamanhoMaximoFila = 50 }) {
  const intervaloMs = 1000 / requisicoesPorSegundo;
  let proximoHorarioLivre = 0;
  let tamanhoFila = 0;
  let circuitoAbertoAte = 0;

  function segundosRestantes() {
    return Math.max(1, Math.ceil((circuitoAbertoAte - Date.now()) / 1000));
  }

  function abrirCircuito(ms) {
    circuitoAbertoAte = Math.max(circuitoAbertoAte, Date.now() + ms);
  }

  function resetar() {
    circuitoAbertoAte = 0;
    proximoHorarioLivre = 0;
    tamanhoFila = 0;
  }

  async function executar(tarefa) {
    if (Date.now() < circuitoAbertoAte) {
      throw new ErroCircuitoAberto(segundosRestantes());
    }

    if (tamanhoFila >= tamanhoMaximoFila) {
      throw new ErroFilaCheia();
    }

    tamanhoFila += 1;
    try {
      const agora = Date.now();
      const horarioExecucao = Math.max(agora, proximoHorarioLivre);
      proximoHorarioLivre = horarioExecucao + intervaloMs;
      const espera = horarioExecucao - agora;

      if (espera > 0) {
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    } finally {
      tamanhoFila -= 1;
    }

    if (Date.now() < circuitoAbertoAte) {
      throw new ErroCircuitoAberto(segundosRestantes());
    }

    return tarefa();
  }

  return { executar, abrirCircuito, resetar };
}
