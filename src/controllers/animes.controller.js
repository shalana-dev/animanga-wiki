import { buscarAgendaSemanal as agendaAniList } from "../services/anilist.service.js";
import {
  buscarDestaquesTemporada,
  buscarAgendaSemanal as agendaJikan,
} from "../services/jikan.service.js";
import { responderErroExterno } from "../utils/erroExterno.js";

export async function obterCalendario(req, res) {
  try {
    const dados = await agendaAniList();
    return res.json({ fonte: "anilist", ...dados });
  } catch (erroAniList) {
    // AniList é a fonte preferida (tem horário exato de exibição). se ela cai
    // e não há nem resposta antiga em reserva, a programação da Jikan cobre o
    // básico, só sem timestamp
    try {
      const dados = await agendaJikan();
      return res.json({ fonte: "jikan", ...dados });
    } catch {
      return responderErroExterno(
        res,
        erroAniList,
        "Não foi possível carregar a programação de animes agora.",
      );
    }
  }
}

export async function obterDestaques(req, res) {
  try {
    const dados = await buscarDestaquesTemporada();
    return res.json(dados);
  } catch (erro) {
    return responderErroExterno(
      res,
      erro,
      "Não foi possível carregar os destaques da temporada agora.",
    );
  }
}
