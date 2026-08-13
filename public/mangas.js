const MANGAS_API = "/api/mangas";
const TAMANHO_MINIMO_TITULO = 2;
const TAMANHO_MAXIMO_TITULO = 100;

// timeout único da checagem do back-end em segundo plano, sem retry
const TEMPO_LIMITE_VERIFICACAO_BACKEND = 5000;

// quantos títulos aparecem antes do "Mostrar mais"
const TAMANHO_INICIAL_COLECAO = 9;

// mesmos 20 títulos de COLECAO_INICIAL_IDS, pra Biblioteca funcionar sem
// back-end. sem descrição/tags: aqui o card só linka pro MangaDex mesmo
const COLECAO_INICIAL_LOCAL = Object.freeze([
  {
    id: "a1c7c817-4e59-43b7-9365-09675a149a6f",
    titulo: "One Piece",
    ano: 1997,
    status: "ongoing",
    capa:
      "https://uploads.mangadex.org/covers/a1c7c817-4e59-43b7-9365-09675a149a6f/2f4aca53-64c7-46ac-ae85-3bc9b3169890.png.256.jpg",
    link: "https://mangadex.org/title/a1c7c817-4e59-43b7-9365-09675a149a6f",
  },
  {
    id: "6b1eb93e-473a-4ab3-9922-1a66d2a29a4a",
    titulo: "Naruto",
    ano: 1999,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/6b1eb93e-473a-4ab3-9922-1a66d2a29a4a/c5a3090c-4ca0-40a2-9102-e0ee0c6dac15.jpg.256.jpg",
    link: "https://mangadex.org/title/6b1eb93e-473a-4ab3-9922-1a66d2a29a4a",
  },
  {
    id: "801513ba-a712-498c-8f57-cae55b38cc92",
    titulo: "Berserk",
    ano: 1989,
    status: "ongoing",
    capa:
      "https://uploads.mangadex.org/covers/801513ba-a712-498c-8f57-cae55b38cc92/81e1c82d-6672-400c-8c58-4ff9bfb89031.jpg.256.jpg",
    link: "https://mangadex.org/title/801513ba-a712-498c-8f57-cae55b38cc92",
  },
  {
    id: "75ee72ab-c6bf-4b87-badd-de839156934c",
    titulo: "Death Note",
    ano: 2003,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/75ee72ab-c6bf-4b87-badd-de839156934c/d6555598-8202-477d-acde-303202cb3475.jpg.256.jpg",
    link: "https://mangadex.org/title/75ee72ab-c6bf-4b87-badd-de839156934c",
  },
  {
    id: "304ceac3-8cdb-4fe7-acf7-2b6ff7a60613",
    titulo: "Attack on Titan",
    ano: 2009,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/304ceac3-8cdb-4fe7-acf7-2b6ff7a60613/29f82b1d-b37f-455a-b630-e42bccb1422a.jpg.256.jpg",
    link: "https://mangadex.org/title/304ceac3-8cdb-4fe7-acf7-2b6ff7a60613",
  },
  {
    id: "789642f8-ca89-4e4e-8f7b-eee4d17ea08b",
    titulo: "Demon Slayer: Kimetsu no Yaiba",
    ano: 2016,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/789642f8-ca89-4e4e-8f7b-eee4d17ea08b/60530e72-f76f-45d5-b6f9-f95e05058fc3.png.256.jpg",
    link: "https://mangadex.org/title/789642f8-ca89-4e4e-8f7b-eee4d17ea08b",
  },
  {
    id: "c52b2ce3-7f95-469c-96b0-479524fb7a1a",
    titulo: "Jujutsu Kaisen",
    ano: 2018,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/c52b2ce3-7f95-469c-96b0-479524fb7a1a/6d9134b2-21ea-4d02-ac2b-7c0d1c6a2aaa.jpg.256.jpg",
    link: "https://mangadex.org/title/c52b2ce3-7f95-469c-96b0-479524fb7a1a",
  },
  {
    id: "a77742b1-befd-49a4-bff5-1ad4e6b0ef7b",
    titulo: "Chainsaw Man",
    ano: 2018,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/a77742b1-befd-49a4-bff5-1ad4e6b0ef7b/6e518bd1-5f60-446b-8832-bfe6bf74834b.jpg.256.jpg",
    link: "https://mangadex.org/title/a77742b1-befd-49a4-bff5-1ad4e6b0ef7b",
  },
  {
    id: "40bc649f-7b49-4645-859e-6cd94136e722",
    titulo: "Dragon Ball",
    ano: 1984,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/40bc649f-7b49-4645-859e-6cd94136e722/b048eb82-670b-4b41-9fc1-38bf7dd52159.jpg.256.jpg",
    link: "https://mangadex.org/title/40bc649f-7b49-4645-859e-6cd94136e722",
  },
  {
    id: "239d6260-d71f-43b0-afff-074e3619e3de",
    titulo: "Bleach",
    ano: 2001,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/239d6260-d71f-43b0-afff-074e3619e3de/032cc781-43eb-4281-956c-7cf991dd0a6a.jpg.256.jpg",
    link: "https://mangadex.org/title/239d6260-d71f-43b0-afff-074e3619e3de",
  },
  {
    id: "dd8a907a-3850-4f95-ba03-ba201a8399e3",
    titulo: "Fullmetal Alchemist",
    ano: 2001,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/dd8a907a-3850-4f95-ba03-ba201a8399e3/a9cd0207-1b86-4738-a2b5-3575c32d5315.jpg.256.jpg",
    link: "https://mangadex.org/title/dd8a907a-3850-4f95-ba03-ba201a8399e3",
  },
  {
    id: "db692d58-4b13-4174-ae8c-30c515c0689c",
    titulo: "Hunter x Hunter",
    ano: 1998,
    status: "ongoing",
    capa:
      "https://uploads.mangadex.org/covers/db692d58-4b13-4174-ae8c-30c515c0689c/aa112927-f1e5-4fe4-a4db-7fd4a1536e3c.jpg.256.jpg",
    link: "https://mangadex.org/title/db692d58-4b13-4174-ae8c-30c515c0689c",
  },
  {
    id: "5a547d1d-576b-477f-8cb3-70a3b4187f8a",
    titulo: "JoJo's Bizarre Adventure",
    ano: 1986,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/5a547d1d-576b-477f-8cb3-70a3b4187f8a/263645fa-129c-4d77-b69d-61d0880fb13e.jpg.256.jpg",
    link: "https://mangadex.org/title/5a547d1d-576b-477f-8cb3-70a3b4187f8a",
  },
  {
    id: "d1a9fdeb-f713-407f-960c-8326b586e6fd",
    titulo: "Vagabond",
    ano: 1999,
    status: "hiatus",
    capa:
      "https://uploads.mangadex.org/covers/d1a9fdeb-f713-407f-960c-8326b586e6fd/05f8dcb4-8ea1-48db-a0b1-3a8fbf695e5a.jpg.256.jpg",
    link: "https://mangadex.org/title/d1a9fdeb-f713-407f-960c-8326b586e6fd",
  },
  {
    id: "5d1fc77e-706a-4fc5-bea8-486c9be0145d",
    titulo: "Vinland Saga",
    ano: 2005,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/5d1fc77e-706a-4fc5-bea8-486c9be0145d/7fa60f5d-285a-40c5-8a1d-9cf375eaf897.jpg.256.jpg",
    link: "https://mangadex.org/title/5d1fc77e-706a-4fc5-bea8-486c9be0145d",
  },
  {
    id: "6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b",
    titulo: "Tokyo Ghoul",
    ano: 2011,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b/040e8ae9-4ddd-49d2-8986-56782b391714.jpg.256.jpg",
    link: "https://mangadex.org/title/6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b",
  },
  {
    id: "4f3bcae4-2d96-4c9d-932c-90181d9c873e",
    titulo: "My Hero Academia",
    ano: 2014,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/4f3bcae4-2d96-4c9d-932c-90181d9c873e/c7a7101a-8e22-442b-a1db-55ba9ef5b1ab.jpg.256.jpg",
    link: "https://mangadex.org/title/4f3bcae4-2d96-4c9d-932c-90181d9c873e",
  },
  {
    id: "d8a959f7-648e-4c8d-8f23-f1f3f8e129f3",
    titulo: "One-Punch Man",
    ano: 2012,
    status: "ongoing",
    capa:
      "https://uploads.mangadex.org/covers/d8a959f7-648e-4c8d-8f23-f1f3f8e129f3/511fc404-e6b4-4204-bb10-e4a28f7b5271.jpg.256.jpg",
    link: "https://mangadex.org/title/d8a959f7-648e-4c8d-8f23-f1f3f8e129f3",
  },
  {
    id: "e39944f5-15bf-4464-9556-a4e9b3945571",
    titulo: "Sailor Moon",
    ano: 1991,
    status: "completed",
    capa:
      "https://uploads.mangadex.org/covers/e39944f5-15bf-4464-9556-a4e9b3945571/a2f3cb7f-7d54-47ad-bfd0-5b0db07c12d4.jpg.256.jpg",
    link: "https://mangadex.org/title/e39944f5-15bf-4464-9556-a4e9b3945571",
  },
  {
    id: "6b958848-c885-4735-9201-12ee77abcb3c",
    titulo: "Spy x Family",
    ano: 2019,
    status: "ongoing",
    capa:
      "https://uploads.mangadex.org/covers/6b958848-c885-4735-9201-12ee77abcb3c/91a35e78-62b2-41fe-9869-ce051f2d1070.jpg.256.jpg",
    link: "https://mangadex.org/title/6b958848-c885-4735-9201-12ee77abcb3c",
  },
]);

const estadoMangas = {
  resultados: [],
  colecaoInicial: [],
  quantidadeColecaoVisivel: TAMANHO_INICIAL_COLECAO,
  exibindoColecao: false,
  backendDisponivel: false,
  selecionado: null,
  capitulos: [],
  paginaCapitulos: 1,
  totalCapitulos: 0,
};

const elementosMangas = {
  formulario: document.querySelector("#form-busca-mangas"),
  campo: document.querySelector("#busca-manga"),
  estado: document.querySelector("#estado-mangas"),
  estadoTexto: document.querySelector("#estado-mangas-texto"),
  grade: document.querySelector("#grade-mangas"),
  mensagem: document.querySelector("#mensagem-mangas"),
  detalhe: document.querySelector("#detalhe-manga"),
  botaoExpandirColecao: document.querySelector("#botao-expandir-colecao"),
};

let controladorBuscaManga = null;
let controladorCapitulos = null;

function traduzirStatusManga(status) {
  const traducoes = {
    ongoing: "Em lançamento",
    completed: "Completo",
    hiatus: "Em hiato",
    cancelled: "Cancelado",
  };
  return traducoes[status] || "Status desconhecido";
}

function formatarDataCapitulo(data) {
  if (!data) return "Data desconhecida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function iniciarCarregamentoMangas(mostrar, texto) {
  elementosMangas.estado.hidden = !mostrar;
  if (texto) elementosMangas.estadoTexto.textContent = texto;
}

function montarCardManga(manga) {
  // sem back-end não tem como abrir a ficha interna, então vira link direto
  // pro MangaDex
  const semBackend = !estadoMangas.backendDisponivel;
  const card = document.createElement(semBackend ? "a" : "button");
  card.className = "manga-card";

  if (semBackend) {
    card.href = manga.link || `https://mangadex.org/title/${manga.id}`;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.setAttribute("aria-label", `Abrir ${manga.titulo} no MangaDex`);
  } else {
    card.type = "button";
    card.setAttribute("aria-label", `Ver detalhes de ${manga.titulo}`);
  }

  card.innerHTML = `
    <span class="manga-capa">
      ${
        manga.capa
          ? `<img src="${escaparHTML(manga.capa)}" alt="" loading="lazy" decoding="async" />`
          : `<span class="manga-capa-vazia" aria-hidden="true">${escaparHTML(manga.titulo.charAt(0))}</span>`
      }
    </span>
    <span class="manga-info">
      <span class="manga-titulo">${escaparHTML(manga.titulo)}</span>
      <span class="manga-meta">${escaparHTML(manga.ano ? String(manga.ano) : "Ano desconhecido")} · ${escaparHTML(traduzirStatusManga(manga.status))}</span>
    </span>
  `;

  if (!semBackend) card.addEventListener("click", () => abrirDetalheManga(manga));
  return card;
}

function renderizarGradeMangas() {
  elementosMangas.grade.innerHTML = "";
  const fragmento = document.createDocumentFragment();
  estadoMangas.resultados.forEach((manga) => fragmento.appendChild(montarCardManga(manga)));
  elementosMangas.grade.appendChild(fragmento);
  elementosMangas.grade.hidden = false;
}

function atualizarBotaoExpandirColecao() {
  const botao = elementosMangas.botaoExpandirColecao;
  if (!botao) return;

  const detalheAberto = !elementosMangas.detalhe.hidden;
  botao.hidden = !estadoMangas.exibindoColecao || detalheAberto;
  if (botao.hidden) return;

  const expandido = estadoMangas.quantidadeColecaoVisivel >= estadoMangas.colecaoInicial.length;
  botao.setAttribute("aria-expanded", String(expandido));
  botao.textContent = expandido ? "Mostrar menos" : "Mostrar mais";
}

// só a coleção inicial é cortada; busca sempre mostra a lista completa
function renderizarColecaoInicial() {
  estadoMangas.exibindoColecao = true;
  estadoMangas.resultados = estadoMangas.colecaoInicial.slice(0, estadoMangas.quantidadeColecaoVisivel);
  renderizarGradeMangas();
  atualizarBotaoExpandirColecao();
}

function alternarExpansaoColecao() {
  const totalColecao = estadoMangas.colecaoInicial.length;
  estadoMangas.quantidadeColecaoVisivel =
    estadoMangas.quantidadeColecaoVisivel >= totalColecao ? TAMANHO_INICIAL_COLECAO : totalColecao;
  renderizarColecaoInicial();
}

function carregarColecaoInicial() {
  // 1. mostra a coleção local na hora, sem esperar rede
  estadoMangas.colecaoInicial = COLECAO_INICIAL_LOCAL;
  estadoMangas.quantidadeColecaoVisivel = TAMANHO_INICIAL_COLECAO;
  elementosMangas.mensagem.hidden = true;
  renderizarColecaoInicial();

  // 2. só depois confirma o back-end em segundo plano, uma vez
  verificarBackendEmSegundoPlano();
}

async function verificarBackendEmSegundoPlano() {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_VERIFICACAO_BACKEND);

  try {
    const resposta = await fetch(`${MANGAS_API}/colecao-inicial`, { signal: controlador.signal });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.resultados?.length) return;

    // back-end respondeu: troca pra versão de servidor, sem avisar nada.
    // mantém a quantidade visível atual, sem recolher nada de surpresa
    estadoMangas.backendDisponivel = true;
    estadoMangas.colecaoInicial = dados.resultados;
    // só redesenha se a Biblioteca estiver mesmo na tela agora
    if (estadoMangas.exibindoColecao && elementosMangas.detalhe.hidden) renderizarColecaoInicial();
  } catch {
    // back-end fora do ar (desligado, index.html direto do disco, timeout...):
    // fica na coleção local, sem erro nenhum na tela
  } finally {
    clearTimeout(limite);
  }
}

function restaurarColecaoInicial() {
  fecharDetalheManga();
  controladorBuscaManga?.abort();
  elementosMangas.mensagem.hidden = true;
  estadoMangas.quantidadeColecaoVisivel = TAMANHO_INICIAL_COLECAO;
  renderizarColecaoInicial();
}

async function pesquisarMangasNaAPI(titulo) {
  controladorBuscaManga?.abort();
  controladorBuscaManga = new AbortController();

  const url = `${MANGAS_API}?titulo=${encodeURIComponent(titulo)}`;
  const resposta = await fetch(url, { signal: controladorBuscaManga.signal });
  const dados = await resposta.json();

  if (!resposta.ok) {
    const erro = new Error(dados.erro || "Falha na busca de mangás.");
    erro.retryAfter = resposta.headers.get("retry-after");
    throw erro;
  }

  return dados;
}

async function executarBuscaMangas(titulo) {
  fecharDetalheManga();
  iniciarCarregamentoMangas(true, "Procurando mangás...");
  elementosMangas.mensagem.hidden = true;
  elementosMangas.grade.hidden = true;
  estadoMangas.exibindoColecao = false;
  atualizarBotaoExpandirColecao();

  try {
    const dados = await pesquisarMangasNaAPI(titulo);
    estadoMangas.resultados = dados.resultados;

    if (!estadoMangas.resultados.length) {
      mostrarMensagem(
        elementosMangas.mensagem,
        "Nenhum mangá encontrado",
        "Tente outro termo de busca ou volte para a biblioteca.",
        () => {
          elementosMangas.campo.value = "";
          restaurarColecaoInicial();
        },
        "Voltar à biblioteca",
      );
      return;
    }

    renderizarGradeMangas();
  } catch (erro) {
    if (erro.name === "AbortError") return;
    const texto = erro.retryAfter
      ? `Muitas buscas em pouco tempo. Aguarde ${erro.retryAfter} segundos e tente de novo.`
      : "Não foi possível consultar o MangaDex agora.";
    mostrarMensagem(elementosMangas.mensagem, "A busca não funcionou", texto, () =>
      executarBuscaMangas(titulo),
    );
  } finally {
    iniciarCarregamentoMangas(false);
  }
}

function montarEsqueletoDetalhe(manga) {
  const tags = manga.tags
    .slice(0, 8)
    .map((tag) => `<li>${escaparHTML(tag)}</li>`)
    .join("");

  return `
    <button type="button" class="botao-voltar">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
      Voltar aos resultados
    </button>
    <div class="detalhe-cabecalho">
      <div class="detalhe-capa">
        ${
          manga.capa
            ? `<img src="${escaparHTML(manga.capa)}" alt="Capa de ${escaparHTML(manga.titulo)}" />`
            : `<span class="manga-capa-vazia" aria-hidden="true">${escaparHTML(manga.titulo.charAt(0))}</span>`
        }
      </div>
      <div class="detalhe-info">
        <div class="destaque-meta">
          <span>${escaparHTML(traduzirStatusManga(manga.status))}</span>
          <span>${escaparHTML(manga.ano ? String(manga.ano) : "Ano desconhecido")}</span>
        </div>
        <h3 class="detalhe-titulo">${escaparHTML(manga.titulo)}</h3>
        <p class="detalhe-descricao">${escaparHTML(manga.descricao || "Descrição não disponível para este título.")}</p>
        ${tags ? `<ul class="detalhe-tags">${tags}</ul>` : ""}
        <a
          class="botao-principal"
          href="https://mangadex.org/title/${escaparHTML(manga.id)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir no MangaDex
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </a>
      </div>
    </div>
    <div class="detalhe-capitulos">
      <h4>Capítulos em português</h4>
      <div id="estado-capitulos" class="estado-carregando" role="status" aria-live="polite">
        <span class="spinner"></span>
        <span>Carregando capítulos...</span>
      </div>
      <ol id="lista-capitulos" class="lista-capitulos"></ol>
      <div id="mensagem-capitulos" class="mensagem-estado" hidden></div>
      <button type="button" id="carregar-mais-capitulos" class="botao-carregar-mais" hidden>
        Carregar mais capítulos
      </button>
    </div>
  `;
}

function renderizarCapitulos() {
  const listaEl = document.querySelector("#lista-capitulos");
  if (!listaEl) return;

  listaEl.innerHTML = estadoMangas.capitulos
    .map(
      (capitulo) => `
        <li class="capitulo-item">
          <div class="capitulo-info">
            <span class="capitulo-numero">Cap. ${escaparHTML(capitulo.capitulo || "avulso")}</span>
            <span class="capitulo-titulo">${escaparHTML(capitulo.titulo || "Sem título")}</span>
            <span class="capitulo-meta">${escaparHTML(capitulo.grupo)} · ${escaparHTML(formatarDataCapitulo(capitulo.data))}</span>
          </div>
          <a
            class="botao-icone"
            href="${escaparHTML(capitulo.link)}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir capítulo ${escaparHTML(capitulo.capitulo || "")} no MangaDex"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </a>
        </li>
      `,
    )
    .join("");
}

async function carregarCapitulos(id) {
  const estadoEl = elementosMangas.detalhe.querySelector("#estado-capitulos");
  const mensagemEl = elementosMangas.detalhe.querySelector("#mensagem-capitulos");
  const botaoMais = elementosMangas.detalhe.querySelector("#carregar-mais-capitulos");
  if (!estadoEl || !mensagemEl || !botaoMais) return;

  controladorCapitulos?.abort();
  controladorCapitulos = new AbortController();
  const { signal } = controladorCapitulos;

  estadoEl.hidden = false;
  mensagemEl.hidden = true;
  botaoMais.hidden = true;

  try {
    const url = `${MANGAS_API}/${id}/capitulos?idioma=pt-br&pagina=${estadoMangas.paginaCapitulos}`;
    const resposta = await fetch(url, { signal });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar capítulos.");

    estadoMangas.capitulos.push(...dados.capitulos);
    estadoMangas.totalCapitulos = dados.total;
    renderizarCapitulos();

    if (!estadoMangas.capitulos.length) {
      mostrarMensagem(
        mensagemEl,
        "Sem capítulos em português",
        "Este título ainda não tem capítulos traduzidos para pt-br no MangaDex.",
      );
    } else if (estadoMangas.capitulos.length < estadoMangas.totalCapitulos) {
      botaoMais.hidden = false;
    }
  } catch (erro) {
    if (erro.name === "AbortError") return;
    mostrarMensagem(mensagemEl, "Os capítulos não carregaram", "Tente novamente.", () =>
      carregarCapitulos(id),
    );
  } finally {
    if (!signal.aborted) estadoEl.hidden = true;
  }
}

function fecharDetalheManga() {
  controladorCapitulos?.abort();
  if (elementosMangas.detalhe.hidden) return;
  elementosMangas.detalhe.hidden = true;
  elementosMangas.detalhe.innerHTML = "";
  elementosMangas.grade.hidden = estadoMangas.resultados.length === 0;
  atualizarBotaoExpandirColecao();
}

async function abrirDetalheManga(manga) {
  estadoMangas.selecionado = manga;
  estadoMangas.paginaCapitulos = 1;
  estadoMangas.capitulos = [];

  elementosMangas.grade.hidden = true;
  elementosMangas.mensagem.hidden = true;
  elementosMangas.detalhe.hidden = false;
  elementosMangas.detalhe.innerHTML = montarEsqueletoDetalhe(manga);
  atualizarBotaoExpandirColecao();

  const botaoVoltar = elementosMangas.detalhe.querySelector(".botao-voltar");
  botaoVoltar.addEventListener("click", fecharDetalheManga);
  botaoVoltar.focus();

  elementosMangas.detalhe
    .querySelector("#carregar-mais-capitulos")
    .addEventListener("click", () => {
      estadoMangas.paginaCapitulos += 1;
      carregarCapitulos(manga.id);
    });

  await carregarCapitulos(manga.id);
}

elementosMangas.formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const titulo = elementosMangas.campo.value.trim();

  if (!estadoMangas.backendDisponivel) {
    mostrarMensagem(
      elementosMangas.mensagem,
      "Busca indisponível sem o servidor",
      "Para pesquisar outros mangás e consultar capítulos, execute o servidor do projeto com npm start.",
    );
    return;
  }

  if (titulo.length < TAMANHO_MINIMO_TITULO) {
    mostrarMensagem(
      elementosMangas.mensagem,
      "Termo muito curto",
      `Digite pelo menos ${TAMANHO_MINIMO_TITULO} caracteres para buscar.`,
    );
    elementosMangas.grade.hidden = true;
    estadoMangas.exibindoColecao = false;
    atualizarBotaoExpandirColecao();
    return;
  }

  if (titulo.length > TAMANHO_MAXIMO_TITULO) {
    mostrarMensagem(
      elementosMangas.mensagem,
      "Termo muito longo",
      `Use no máximo ${TAMANHO_MAXIMO_TITULO} caracteres na busca.`,
    );
    elementosMangas.grade.hidden = true;
    estadoMangas.exibindoColecao = false;
    atualizarBotaoExpandirColecao();
    return;
  }

  executarBuscaMangas(titulo);
});

elementosMangas.campo.addEventListener("input", () => {
  if (!elementosMangas.campo.value.trim()) restaurarColecaoInicial();
});

elementosMangas.botaoExpandirColecao?.addEventListener("click", alternarExpansaoColecao);

carregarColecaoInicial();
