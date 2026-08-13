export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: "Rota não encontrada." });
}

export function tratarErro(erro, req, res, next) {
  console.error(erro);
  res.status(500).json({ erro: "Erro interno no servidor." });
}
