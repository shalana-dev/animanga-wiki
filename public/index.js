// dados de anime agora vêm do back-end do próprio site (/api/calendario e
// /api/destaques), que fala com AniList e Jikan pelo servidor: sem CORS, com
// cache e com reserva da última resposta boa. antes essas chamadas saíam
// direto do navegador e quebravam quando AniList/Jikan respondiam um erro sem
// cabeçalho Access-Control-Allow-Origin.

const dias = [
  { id: "domingo", nome: "Domingo" },
  { id: "segunda", nome: "Segunda-feira" },
  { id: "terca", nome: "Terça-feira" },
  { id: "quarta", nome: "Quarta-feira" },
  { id: "quinta", nome: "Quinta-feira" },
  { id: "sexta", nome: "Sexta-feira" },
  { id: "sabado", nome: "Sábado" },
];
const diaPorId = Object.fromEntries(dias.map((dia) => [dia.id, dia]));

const estado = {
  calendario: [],
  destaques: [],
  indice: 0,
  dia: "todos",
  busca: "",
};

const elementos = {
  grade: document.querySelector("#grade-calendario"),
  estadoCalendario: document.querySelector("#estado-calendario"),
  mensagemCalendario: document.querySelector("#mensagem-calendario"),
  estadoDestaques: document.querySelector("#estado-destaques"),
  mensagemDestaques: document.querySelector("#mensagem-destaques"),
  cartao: document.querySelector("#cartao-destaque"),
  busca: document.querySelector("#busca-anime"),
  totalHero: document.querySelector("#total-hero"),
};

function escaparHTML(texto = "") {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizar(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

async function buscarAPI(caminho) {
  for (let tentativa = 0; tentativa < 2; tentativa += 1) {
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 15000);

    try {
      const resposta = await fetch(`/api${caminho}`, { signal: controlador.signal });
      if (!resposta.ok) {
        const erro = new Error(`Erro ${resposta.status}`);
        erro.tentarNovamente = resposta.status === 429 || resposta.status >= 500;
        throw erro;
      }
      return await resposta.json();
    } catch (erro) {
      if (tentativa === 1 || (!erro.tentarNovamente && erro.name !== "AbortError")) throw erro;
      await new Promise((resolver) => setTimeout(resolver, 1200));
    } finally {
      clearTimeout(limite);
    }
  }
}

// quando a fonte é a AniList, o item traz airingAt (Unix, em segundos) e a
// conversão de dia/horário para o fuso de quem acessa acontece aqui. quando a
// fonte é a Jikan (fallback), vem só o dia da semana e o horário em JST.
function prepararItemCalendario(item) {
  if (item.airingAt) {
    const exibicao = new Date(item.airingAt * 1000);
    return {
      ...item,
      dia: dias[exibicao.getDay()],
      horarioLocal: exibicao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      timestamp: exibicao.getTime(),
    };
  }

  return {
    ...item,
    dia: diaPorId[item.dia] || dias[0],
    horarioLocal: item.horarioJST ? `${item.horarioJST.slice(0, 5)} JST` : "Horário a confirmar",
    timestamp: null,
  };
}

function mostrarMensagem(elemento, titulo, texto, acao, rotuloBotao = "Tentar novamente") {
  elemento.innerHTML = `
    <strong>${escaparHTML(titulo)}</strong>
    <span>${escaparHTML(texto)}</span>
    ${acao ? `<button type="button">${escaparHTML(rotuloBotao)}</button>` : ""}
  `;
  elemento.hidden = false;
  if (acao) elemento.querySelector("button").addEventListener("click", acao);
}

function obterDiaAtual() {
  const mapa = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  return mapa[new Date().getDay()];
}

function renderizarCalendario() {
  const busca = normalizar(estado.busca);
  const filtrados = estado.calendario.filter((anime) => {
    const correspondeDia = estado.dia === "todos" || anime.dia.id === estado.dia;
    const correspondeBusca = normalizar(`${anime.title} ${anime.title_english || ""}`).includes(busca);
    return correspondeDia && correspondeBusca;
  });

  elementos.grade.innerHTML = "";
  elementos.mensagemCalendario.hidden = true;

  if (!filtrados.length) {
    mostrarMensagem(
      elementos.mensagemCalendario,
      "Nenhum anime encontrado",
      "Tente outro termo ou selecione um dia diferente.",
    );
    return;
  }

  const fragmento = document.createDocumentFragment();
  filtrados.forEach((anime) => {
    const link = document.createElement("a");
    link.className = "anime-item";
    link.href = anime.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Ver detalhes de ${anime.title}`);

    link.innerHTML = `
      <img src="${escaparHTML(anime.imagemAlta || "")}" alt="" loading="lazy" decoding="async" width="80" height="98" />
      <div class="anime-info">
        <span class="anime-dia">${escaparHTML(anime.dia.nome)}</span>
        <h3>${escaparHTML(anime.title)}</h3>
        <span class="anime-horario">${escaparHTML(
          `${anime.horarioLocal}${anime.episodio ? ` · Ep. ${anime.episodio}` : ""}`,
        )}</span>
      </div>
    `;
    fragmento.appendChild(link);
  });
  elementos.grade.appendChild(fragmento);
}

function atualizarHero() {
  const lista = document.querySelector("#hero-lista");
  if (!lista) return;

  const agora = Date.now();
  const futuras = estado.calendario.filter((anime) => !anime.timestamp || anime.timestamp >= agora);
  const proximas = (futuras.length ? futuras : estado.calendario).slice(0, 4);

  lista.innerHTML = "";
  proximas.forEach((anime) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    const titulo = document.createElement("strong");
    const detalhe = document.createElement("small");
    const horario = document.createElement("time");

    link.href = anime.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    titulo.textContent = anime.title;
    detalhe.textContent = `${anime.dia.nome}${anime.episodio ? ` · Episódio ${anime.episodio}` : ""}`;
    horario.textContent = anime.horarioLocal;

    link.append(titulo, detalhe);
    item.append(link, horario);
    lista.appendChild(item);
  });
}

async function carregarCalendario() {
  elementos.estadoCalendario.style.display = "flex";
  elementos.grade.innerHTML = "";
  elementos.mensagemCalendario.hidden = true;

  try {
    const dados = await buscarAPI("/calendario");
    estado.calendario = (dados.resultados || []).map(prepararItemCalendario);

    elementos.totalHero.textContent = estado.calendario.length || "0";
    atualizarHero();
    renderizarCalendario();

    const hoje = obterDiaAtual();
    const botaoHoje = document.querySelector(`[data-dia="${hoje}"]`);
    if (botaoHoje) botaoHoje.title = "Hoje";
  } catch {
    const listaHero = document.querySelector("#hero-lista");
    if (listaHero) listaHero.innerHTML = '<li class="hero-lista-carregando">Programação indisponível.</li>';
    mostrarMensagem(
      elementos.mensagemCalendario,
      "O calendário tirou uma pausa",
      "Não foi possível acessar os lançamentos agora.",
      carregarCalendario,
    );
  } finally {
    elementos.estadoCalendario.style.display = "none";
  }
}

function traduzirStatus(status) {
  const traducoes = {
    "Currently Airing": "Em exibição",
    "Finished Airing": "Finalizado",
    "Not yet aired": "Em breve",
  };
  return traducoes[status] || status || "Temporada atual";
}

function renderizarDestaque() {
  const anime = estado.destaques[estado.indice];
  if (!anime) return;

  const imagem = elementos.cartao.querySelector(".destaque-imagem");
  imagem.style.opacity = "0";
  imagem.src = anime.imagemAlta || "";
  imagem.alt = `Capa de ${anime.title}`;
  imagem.onload = () => {
    imagem.style.opacity = "1";
  };

  elementos.cartao.querySelector(".destaque-posicao").textContent = String(estado.indice + 1).padStart(2, "0");
  elementos.cartao.querySelector(".destaque-tipo").textContent = anime.type || "Anime";
  elementos.cartao.querySelector(".destaque-status").textContent = traduzirStatus(anime.status);
  elementos.cartao.querySelector(".destaque-titulo").textContent = anime.title;
  elementos.cartao.querySelector(".destaque-nota strong").textContent = anime.score?.toFixed(1) || "Sem nota";
  const sinopseEmPortugues = window.SINOPSES_PT?.[anime.mal_id];
  elementos.cartao.querySelector(".destaque-sinopse").textContent =
    sinopseEmPortugues ||
    anime.synopsis ||
    "A sinopse deste título ainda não está disponível.";
  elementos.cartao.querySelector(".destaque-link").href = anime.url;
  document.querySelector("#slide-atual").textContent = String(estado.indice + 1).padStart(2, "0");
  document.querySelector("#slide-total").textContent = String(estado.destaques.length).padStart(2, "0");
}

async function carregarDestaques() {
  elementos.estadoDestaques.style.display = "flex";
  elementos.cartao.hidden = true;
  elementos.mensagemDestaques.hidden = true;

  try {
    const dados = await buscarAPI("/destaques");
    estado.destaques = dados.resultados || [];

    if (!estado.destaques.length) throw new Error("Sem destaques");
    estado.indice = 0;
    renderizarDestaque();
    elementos.cartao.hidden = false;
  } catch {
    mostrarMensagem(
      elementos.mensagemDestaques,
      "Os destaques não carregaram",
      "A conexão com a temporada atual falhou. Tente novamente.",
      carregarDestaques,
    );
  } finally {
    elementos.estadoDestaques.style.display = "none";
  }
}

function ativarFiltroDia(botao) {
  document.querySelectorAll(".dia-filtro").forEach((item) => {
    const ativo = item === botao;
    item.classList.toggle("ativo", ativo);
    item.setAttribute("aria-selected", String(ativo));
    item.tabIndex = ativo ? 0 : -1;
  });
  estado.dia = botao.dataset.dia;
  renderizarCalendario();
}

document.querySelectorAll(".dia-filtro").forEach((botao, indice) => {
  botao.tabIndex = indice === 0 ? 0 : -1;
  botao.addEventListener("click", () => ativarFiltroDia(botao));
});

document.querySelector(".dias-filtro").addEventListener("keydown", (evento) => {
  const botoes = Array.from(document.querySelectorAll(".dia-filtro"));
  const indiceAtual = botoes.indexOf(document.activeElement);
  if (indiceAtual === -1) return;

  const proximoIndice = {
    ArrowRight: indiceAtual + 1,
    ArrowLeft: indiceAtual - 1,
    Home: 0,
    End: botoes.length - 1,
  }[evento.key];

  if (proximoIndice === undefined) return;

  evento.preventDefault();
  const proximoBotao = botoes[(proximoIndice + botoes.length) % botoes.length];
  proximoBotao.focus();
  ativarFiltroDia(proximoBotao);
});

elementos.busca.addEventListener("input", (evento) => {
  estado.busca = evento.target.value;
  renderizarCalendario();
});

document.querySelector("#proximo").addEventListener("click", () => {
  estado.indice = (estado.indice + 1) % estado.destaques.length;
  renderizarDestaque();
});

document.querySelector("#anterior").addEventListener("click", () => {
  estado.indice = (estado.indice - 1 + estado.destaques.length) % estado.destaques.length;
  renderizarDestaque();
});

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  localStorage.setItem("animanga-tema", tema);
  const proximoTema = tema === "claro" ? "escuro" : "claro";
  document.querySelector("#alternar-tema").setAttribute("aria-label", `Ativar tema ${proximoTema}`);
}

document.querySelector("#alternar-tema").addEventListener("click", () => {
  aplicarTema(document.documentElement.dataset.tema === "claro" ? "escuro" : "claro");
});

const temaSalvo = localStorage.getItem("animanga-tema");
const prefereClaro = window.matchMedia("(prefers-color-scheme: light)").matches;
aplicarTema(temaSalvo || (prefereClaro ? "claro" : "escuro"));

const heroData = document.querySelector("#hero-data");
if (heroData) {
  const agora = new Date();
  heroData.dateTime = agora.toISOString().slice(0, 10);
  heroData.textContent = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(agora)
    .replace(".", "")
    .toUpperCase();
}

const secoes = document.querySelectorAll("main section[id]");
const linksMenu = document.querySelectorAll(".menu a");
const observador = new IntersectionObserver(
  (entradas) => {
    const visivel = entradas.find((entrada) => entrada.isIntersecting);
    if (!visivel) return;
    linksMenu.forEach((link) => {
      const ativo = link.hash === `#${visivel.target.id}`;
      link.classList.toggle("ativo", ativo);
      if (ativo) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  },
  { rootMargin: "-30% 0px -60% 0px" },
);
secoes.forEach((secao) => observador.observe(secao));

carregarCalendario();
carregarDestaques();
