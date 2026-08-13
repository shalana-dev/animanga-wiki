# Animanga Wiki

Animanga é um guia de temporada de animes e mangás. O front-end é feito com HTML, CSS e JavaScript puro e roda no
navegador. A busca de mangás depende de um pequeno back-end em Node.js e Express, que fica entre o navegador e o
MangaDex para proteger a API externa contra excesso de requisições e para traduzir descrições automaticamente.

A página consulta dados públicos, monta uma programação para os próximos dias, permite pesquisar e filtrar títulos,
apresenta destaques da temporada e permite buscar mangás com capítulos em português.

## Funcionalidades

- programação de animes dos próximos sete dias;
- horários convertidos para o fuso local quando a agenda vem do AniList;
- filtro por todos os dias ou por um dia específico;
- busca de títulos de anime tolerante a maiúsculas, minúsculas e acentos;
- lista das quatro próximas exibições no hero;
- destaques da temporada ordenados por nota;
- navegação circular entre destaques;
- capas em alta resolução consultadas no AniList quando disponíveis;
- remoção de animes e imagens repetidos;
- sinopses locais em português para IDs cadastrados;
- fallback para a sinopse da API ou mensagem padrão;
- biblioteca inicial com uma seleção editorial de 20 mangás conhecidos, já visível ao abrir a página, mostrando
  oito de início e o restante sob demanda pelo botão "Mostrar mais";
- biblioteca inicial funcionando mesmo com o back-end desligado, com os cards levando à página pública do
  MangaDex nesse caso;
- busca de mangás no MangaDex, com ficha de detalhe e capítulos paginados em português;
- tradução automática das descrições de mangá para português quando o MangaDex não fornece uma versão em pt-br;
- tema claro e escuro salvo no navegador;
- estados de carregamento, vazio, erro e nova tentativa;
- layout adaptado para celular, desktop e telas muito grandes;
- recursos de acessibilidade, como HTML semântico, skip link, ARIA, navegação por teclado nas abas de dia e redução
  de movimento.

## Tecnologias

Front-end:

- HTML5 semântico;
- CSS puro, com Flexbox, Grid, variáveis, media queries e animação;
- JavaScript moderno, sem framework;
- Fetch API, Promises e `async`/`await`;
- DOM, `IntersectionObserver`, `AbortController`, `localStorage`, `Intl` e `Date`;
- APIs Jikan e AniList, consultadas diretamente pelo navegador.

Back-end (usado só pela busca de mangás):

- Node.js com Express;
- `helmet`, com uma política de `Content-Security-Policy` explícita;
- `express-rate-limit`, com um limite geral em `/api` e um limite mais restrito em `/api/mangas`;
- cache em memória com coalescência de requisições simultâneas idênticas;
- um limitador de taxa e um circuito de proteção próprios para as chamadas ao MangaDex e ao MyMemory;
- testes automatizados com o executor nativo do Node (`node --test`), sem framework de teste externo.

O front-end não passa por processo de build. O back-end é executado diretamente com `node server.js`, sem
transpilação nem empacotamento.

## Estrutura de arquivos

```text
Animanga Wiki/
├── server.js
├── package.json
├── .env.example
├── public/
│   ├── index.html
│   ├── style.css
│   ├── index.js
│   ├── mangas.js
│   ├── sinopses-pt.js
│   └── assets/
├── src/
│   ├── routes/
│   │   └── mangas.routes.js
│   ├── controllers/
│   │   └── mangas.controller.js
│   ├── services/
│   │   ├── mangadex.service.js
│   │   └── traducao.service.js
│   ├── middlewares/
│   │   └── error.middleware.js
│   └── utils/
│       ├── cache.js
│       └── protecaoExterna.js
└── test/
    ├── cache.test.js
    ├── controller.validacao.test.js
    ├── mangadex.service.test.js
    └── protecaoExterna.test.js
```

### Papel dos arquivos do front-end

| Arquivo | Responsabilidade |
| --- | --- |
| `public/index.html` | Estrutura do cabeçalho, hero, calendário, filtros, busca de anime, destaques, biblioteca de mangás e rodapé. |
| `public/style.css` | Temas, tipografia, layout, cards, estados, responsividade e redução de movimento. |
| `public/sinopses-pt.js` | Dicionário congelado de sinopses em português, indexado por `mal_id`. |
| `public/index.js` | Consulta a Jikan e a AniList, estado do calendário e dos destaques, renderização, eventos, tema, datas e menu ativo. |
| `public/mangas.js` | Busca de mangás, ficha de detalhe e paginação de capítulos, consumindo a API própria do servidor em `/api/mangas`. |

### Papel dos arquivos do back-end

| Arquivo | Responsabilidade |
| --- | --- |
| `server.js` | Cria o servidor Express, aplica `helmet`, CSP, limites de taxa, serve `public/` e monta as rotas de `/api`. |
| `src/routes/mangas.routes.js` | Define as rotas `GET /mangas`, `GET /mangas/:id` e `GET /mangas/:id/capitulos`. |
| `src/controllers/mangas.controller.js` | Valida os parâmetros recebidos e traduz erros do serviço em respostas HTTP. |
| `src/services/mangadex.service.js` | Consulta o MangaDex, normaliza os dados e aplica o limitador de taxa próprio. |
| `src/services/traducao.service.js` | Traduz descrições de mangá para português via MyMemory, com orçamento diário de caracteres e cache de 24 horas. |
| `src/utils/cache.js` | Cache em memória com expiração e coalescência de requisições simultâneas idênticas. |
| `src/utils/protecaoExterna.js` | Fila com intervalo mínimo entre chamadas e circuito de proteção contra respostas 429 de APIs externas. |
| `src/middlewares/error.middleware.js` | Resposta padrão para rota não encontrada e para erro não tratado. |

## Arquitetura

O front-end usa uma organização simples no lado do navegador:

```text
HTML cria os alvos
        ↓
CSS define aparência e estados
        ↓
JavaScript seleciona o DOM e registra eventos
        ↓
Jikan/AniList fornecem dados de anime, direto do navegador
        ↓
map/filter/Set/Map tratam os resultados
        ↓
objeto estado guarda a versão atual
        ↓
funções de renderização atualizam o DOM
```

O objeto `estado`, em `index.js`, guarda calendário, destaques, índice atual, dia selecionado e termo de busca. O
objeto `estadoMangas`, em `mangas.js`, guarda os resultados de mangá, o mangá selecionado e a paginação de
capítulos. Os eventos alteram esses estados e chamam novamente a renderização correspondente.

A busca de mangás segue um caminho diferente, porque passa pelo back-end antes de chegar ao MangaDex:

```text
mangas.js faz fetch em /api/mangas
        ↓
mangas.routes.js encaminha para mangas.controller.js
        ↓
mangas.controller.js valida entrada e chama mangadex.service.js
        ↓
mangadex.service.js consulta o cache, depois a fila de proteção, depois o MangaDex
        ↓
resposta normalizada volta para o navegador
```

## Ordem de carregamento

No fim de `public/index.html`, os scripts são carregados nesta ordem:

```html
<script src="sinopses-pt.js?v=1"></script>
<script src="index.js?v=2"></script>
<script src="mangas.js?v=1"></script>
```

`sinopses-pt.js` vem primeiro para que `window.SINOPSES_PT` já exista quando `index.js` renderizar um destaque.
`mangas.js` vem por último e reaproveita duas funções definidas globalmente em `index.js` (`escaparHTML` e
`mostrarMensagem`), então essa ordem precisa ser mantida. Os parâmetros `?v=1` e `?v=2` ajudam a invalidar o cache
quando a versão do arquivo muda; `mangas.js` ainda não usa esse mesmo parâmetro.

## APIs

### Jikan

URL base:

```text
https://api.jikan.moe/v4
```

Endpoints usados:

- `/schedules?limit=24`: programação usada como fallback;
- `/seasons/now?limit=12`: animes da temporada usados nos destaques.

`buscarJSON()` centraliza a consulta Jikan. A função:

1. cria um `AbortController`;
2. estabelece timeout de 12 segundos;
3. verifica `resposta.ok`;
4. converte o corpo com `resposta.json()`;
5. confirma que `dados.data` é um array;
6. repete uma vez depois de 900 ms em status 429, status 500 ou superior e timeout;
7. limpa o temporizador no `finally`.

### AniList

Endpoint GraphQL:

```text
https://graphql.anilist.co
```

O AniList é consultado por `POST` com corpo JSON. Ele fornece:

- agenda entre o início do dia atual e os sete dias seguintes;
- episódio e timestamp de exibição;
- título em inglês ou romaji;
- URL da mídia;
- capas `large` e `extraLarge`;
- banner, quando disponível.

A agenda usa páginas de até 50 resultados e percorre no máximo quatro páginas. `hasNextPage` encerra o laço antes
quando não existem mais resultados.

### MangaDex

URL base:

```text
https://api.mangadex.org
```

Consultada só pelo back-end, nunca diretamente pelo navegador. `mangadex.service.js` respeita um limite de 3
requisições por segundo (abaixo do limite documentado pelo MangaDex, porque esse teto é dividido entre todos os
visitantes do site ao mesmo tempo) e abre um circuito de proteção temporário quando o MangaDex responde 429.

### MyMemory

URL base:

```text
https://api.mymemory.translated.net/get
```

Consultada só pelo back-end, para traduzir a descrição de um mangá quando o MangaDex não tem uma versão em
`pt-br`. O texto é dividido em blocos, traduzido bloco a bloco, com cache de 24 horas e um orçamento diário de
caracteres para não estourar a cota gratuita do serviço.

## Fluxo do calendário

1. `carregarCalendario()` mostra o estado de carregamento.
2. O código tenta `buscarCalendarioAniList()`.
3. Horários Unix em segundos são convertidos em `Date` e horário local.
4. Se AniList falhar, Jikan fornece `/schedules?limit=24`.
5. Os dados Jikan são limitados a dias reconhecidos e recebem a propriedade `dia`.
6. `removerAnimesRepetidos()` elimina IDs ou títulos equivalentes.
7. `adicionarCapasEmAlta()` tenta enriquecer os itens com imagens AniList.
8. O array é salvo em `estado.calendario`.
9. O total, o hero e a grade são renderizados.
10. Em falha total, aparece uma mensagem com botão "Tentar novamente".
11. O estado de carregamento é removido no `finally`.

## Fallback

O calendário tem duas fontes:

```text
AniList (agenda preferida)
       ↓ falhou
Jikan (programação alternativa)
       ↓
tratamento comum e renderização
```

O enriquecimento de capas é opcional. Se a consulta AniList de imagens falhar, a função devolve os objetos
originais, permitindo que as capas Jikan continuem sendo usadas.

## Destaques

`carregarDestaques()`:

1. consulta `/seasons/now?limit=12`;
2. mantém itens com capa;
3. ordena por nota decrescente;
4. remove animes repetidos;
5. tenta adicionar capas e banners maiores;
6. remove URLs de capa repetidas;
7. salva em `estado.destaques`;
8. define o índice zero e renderiza o cartão.

Os botões anterior e próximo atualizam o índice com aritmética modular, fazendo a navegação circular.

## Sinopses em português

`sinopses-pt.js` define:

```js
window.SINOPSES_PT = Object.freeze({
  59193: "Terceira temporada de Mushoku Tensei...",
});
```

Cada chave é um `mal_id`. A prioridade de exibição é:

```text
tradução local → synopsis da API → mensagem padrão
```

O arquivo não traduz automaticamente. IDs não cadastrados dependem da sinopse remota, que pode estar em inglês.

## Busca de anime

O evento `input` copia o valor do campo para `estado.busca`. `normalizar()`:

- decompõe caracteres com `normalize("NFD")`;
- remove marcas de acento com expressão regular;
- converte para minúsculas.

`renderizarCalendario()` usa `includes()` sobre título principal e título inglês. A busca é refeita a cada
digitação, sem debounce.

## Biblioteca inicial de mangás

Antes de qualquer busca, a seção "Biblioteca de mangás" já mostra uma seleção editorial de vinte títulos
conhecidos (One Piece, Naruto, Berserk, Death Note, Attack on Titan, Demon Slayer, Jujutsu Kaisen, Chainsaw Man,
Dragon Ball, Bleach, Fullmetal Alchemist, Hunter x Hunter, JoJo's Bizarre Adventure, Vagabond, Vinland Saga,
Tokyo Ghoul, My Hero Academia, One-Punch Man, Sailor Moon e Spy x Family), com capa, título, ano e status vindos
do MangaDex. É uma seleção editorial fixa, não um ranking de mais buscados.

Só os oito primeiros aparecem de início. Um botão "Mostrar mais", centralizado logo abaixo da grade, revela os
outros doze; o mesmo botão passa a dizer "Mostrar menos" e devolve a grade aos oito primeiros. A expansão só
reorganiza o que já está em memória (`estadoMangas.quantidadeColecaoVisivel`, alternando entre 8 e 20), sem
nenhuma requisição nova nem recarregamento de página. O botão é um `<button type="button">` de verdade, com
`aria-expanded` e `aria-controls="grade-mangas"`, funciona por teclado como qualquer botão nativo, e fica oculto
durante uma busca ou dentro da ficha de detalhe de um mangá.

`GET /api/mangas/colecao-inicial` busca os vinte IDs cadastrados em `COLECAO_INICIAL_IDS`
(`src/services/mangadex.service.js`) em uma única requisição ao MangaDex, usando o filtro `ids[]`, e passa pelo
mesmo cache e pelo mesmo limitador de taxa usados pela busca comum. Alguns desses títulos não têm título em
inglês cadastrado no MangaDex; para esses casos, `TITULOS_PREFERIDOS_COLECAO` troca o nome pelo título mais
reconhecível (por exemplo "Tokyo Ghoul" em vez de "Toukyou Ghoul"), sem alterar `normalizarManga()` nem a busca
comum. Se um dos títulos não estiver disponível, o restante da coleção continua aparecendo normalmente.
`carregarColecaoInicial()`, em `mangas.js`, guarda o resultado em `estadoMangas.colecaoInicial` e reaproveita
`montarCardManga()` e `abrirDetalheManga()`, as mesmas funções usadas pelos resultados de busca.

Ao pesquisar um título, os resultados da busca (sem nenhum corte de quantidade) substituem a biblioteca
temporariamente. Ao esvaziar o campo de busca (inclusive pelo "x" nativo do campo de busca),
`restaurarColecaoInicial()` traz a biblioteca de volta, recolhida aos oito primeiros, sem uma nova requisição,
porque reaproveita `estadoMangas.colecaoInicial` já carregado. O mesmo acontece ao clicar em "Voltar à
biblioteca" no estado de busca sem resultados.

### Funcionamento sem o back-end

A Biblioteca também funciona abrindo `public/index.html` direto, sem rodar `npm start`. `COLECAO_INICIAL_LOCAL`,
em `mangas.js`, guarda os dados mínimos (id, título, ano, status, capa e link público) dos mesmos vinte títulos,
conferidos manualmente no MangaDex. Ao carregar a página, essa coleção local aparece na hora; só depois disso o
código tenta confirmar o back-end em segundo plano, uma única vez, com um limite de 5 segundos
(`verificarBackendEmSegundoPlano()`). Se o back-end responder, a coleção é atualizada silenciosamente e os cards
passam a abrir a ficha interna; se não responder, os cards continuam como links reais para a página pública do
título no MangaDex, sem nenhuma mensagem de erro. Nesse modo, a busca mostra um aviso explicando que é preciso
rodar `npm start` para pesquisar, sem esconder a biblioteca.

## Busca de mangás

O formulário de busca de mangás valida o tamanho do termo (entre 2 e 100 caracteres) antes de chamar
`GET /api/mangas?titulo=...`. O controller do back-end repete essa mesma validação, porque o navegador não é a
única forma de chamar a API. Ao abrir um mangá, `carregarCapitulos()` busca capítulos em português paginados,
com um botão "Carregar mais capítulos" que soma novas páginas ao estado atual.

## Filtros

Cada botão possui `data-dia`. Ao clicar:

1. a classe `ativo` sai do botão anterior;
2. o novo botão recebe `ativo`;
3. todos recebem `aria-selected="false"`;
4. o escolhido recebe `aria-selected="true"`;
5. `estado.dia` recebe `botao.dataset.dia`;
6. o calendário é renderizado novamente.

As abas de dia também respondem ao teclado, com `ArrowLeft`, `ArrowRight`, `Home` e `End` movendo o foco entre os
botões, seguindo o padrão ARIA de um grupo de abas.

## Tema

`aplicarTema()` escreve `data-tema` no elemento `<html>`. O CSS redefine variáveis quando o valor é `claro`.
A escolha é salva com a chave `animanga-tema` no `localStorage`. Sem preferência salva, `matchMedia` consulta
`prefers-color-scheme: light`.

## Responsividade

O CSS usa quatro grupos principais de media query:

- até 920 px: hero e destaques reduzem a complexidade de colunas;
- até 680 px: menu é ocultado, hero e cards passam para uma coluna e ações empilham;
- a partir de 1800 px: calendário usa quatro colunas;
- a partir de 2400 px: tipografia, cards e espaçamentos aumentam.

`prefers-reduced-motion: reduce` reduz animações, transições e rolagem suave.

## Acessibilidade

Implementações existentes:

- `lang="pt-BR"` e metadados adequados;
- skip link para `#conteudo`;
- regiões semânticas (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`);
- hierarquia de títulos;
- rótulo de busca mesmo com texto visualmente oculto;
- botões nativos com nomes acessíveis;
- SVGs decorativos com `aria-hidden`;
- estados com `role="status"` e `aria-live`;
- estado selecionado nos filtros, com `aria-selected` e navegação por teclado completa (`role="tablist"`);
- `aria-current="page"` no item do menu correspondente à seção visível;
- texto alternativo da capa de destaque;
- respeito a movimento reduzido.

Melhorias recomendadas:

- foco visível consistente em todos os controles;
- `datetime` nos elementos `time` da lista "Próximas exibições" do hero (o `time` principal do hero já recebe esse
  atributo);
- revisão da quantidade de anúncios em regiões `aria-live`.

## Tratamento de erros

- timeout de rede no front-end e no back-end;
- validação de status HTTP;
- validação de arrays;
- nova tentativa seletiva;
- fallback entre APIs de anime;
- falha opcional das capas;
- circuito de proteção e fila no back-end para as APIs de mangá e tradução;
- mensagens de vazio e falha;
- botão de nova tentativa;
- remoção do loading no `finally`.

## Segurança

`escaparHTML()` converte `&`, `<`, `>`, aspas duplas e simples antes de inserir dados em templates com
`innerHTML`, tanto em `index.js` quanto em `mangas.js`. Outros campos usam `textContent`, que não interpreta
marcação. Links externos abertos em nova aba recebem `rel="noopener noreferrer"`.

No back-end, `server.js` aplica `helmet` com uma política de `Content-Security-Policy` explícita (restringindo
scripts, estilos, fontes, imagens e conexões aos domínios usados pelo projeto), desativa o cabeçalho
`X-Powered-By` e aplica limites de taxa por IP em `/api` e, de forma mais restrita, em `/api/mangas`. O
identificador de mangá é validado contra um formato de UUID antes de qualquer consulta ao MangaDex.

Limites atuais:

- URLs de imagem e detalhes vêm de APIs confiadas e não passam por lista de protocolos/domínios;
- `escaparHTML()` protege o contexto de texto HTML, não todos os contextos possíveis;
- chaves secretas jamais deveriam ser colocadas no JavaScript público do front-end.

## Testes

O back-end tem testes automatizados em `test/`, executados com o executor nativo do Node:

```bash
npm test
```

Os testes cobrem o cache e a coalescência de requisições simultâneas (`cache.test.js`), a validação de entrada do
controller de mangás (`controller.validacao.test.js`), o serviço do MangaDex com `fetch` simulado, incluindo
respostas 429, 500 e timeout (`mangadex.service.test.js`), e o limitador de taxa e o circuito de proteção
(`protecaoExterna.test.js`). O front-end não tem testes automatizados.

## Como executar

O front-end de anime funciona mesmo abrindo `public/index.html` diretamente no navegador, porque consulta a Jikan
e a AniList direto do navegador. A busca de mangás não funciona dessa forma, porque depende do back-end em
`/api/mangas`.

Para rodar o projeto completo:

```bash
npm install
npm start
```

Isso inicia o servidor Express na porta definida em `PORT` (3000 por padrão) e serve o front-end a partir de
`public/`. Veja `.env.example` para as variáveis de ambiente opcionais (`PORT`, `TRUST_PROXY` e
`ALLOWED_ORIGIN`).

As APIs exigem internet e precisam aceitar requisições do navegador ou do servidor, dependendo do caso. Se elas
estiverem indisponíveis ou limitarem requisições, o site mostrará os estados de erro previstos.

## `style(1).css` versus `style.css`

Alguns downloads ou cópias do projeto podem acrescentar `(1)` ao nome de um arquivo para evitar sobrescrever
outro. Neste diretório, o arquivo real é `public/style.css`, e `public/index.html` aponta para:

```html
<link rel="stylesheet" href="style.css" />
```

Se o arquivo recebido se chamar `style(1).css`, existem duas soluções:

- renomeá-lo para `style.css`; ou
- alterar o `href` no HTML para o nome exato.

Os nomes precisam coincidir, inclusive espaços, parênteses e extensão.

## Limitações

- conteúdo dinâmico depende de serviços externos, conexão e CORS;
- não existe cache offline dos dados de anime nem de mangá;
- o import de Google Fonts também depende de internet;
- as sinopses em português cobrem apenas IDs cadastrados;
- a agenda AniList percorre no máximo quatro páginas;
- a busca de anime renderiza a cada tecla, sem debounce;
- não há paginação visual nem virtualização de listas;
- o front-end não tem testes automatizados, só o back-end;
- algumas propriedades CSS modernas podem degradar em navegadores antigos;
- o projeto não tem banco de dados, conta de usuário nem autenticação.

## Melhorias futuras

- cache da última resposta do calendário e dos destaques, com suporte offline básico;
- debounce da busca de anime e virtualização para listas grandes;
- validação de URLs externas antes de renderizar imagens;
- testes automatizados também para o front-end;
- namespace ou módulos ES nativos para reduzir o acoplamento implícito entre `index.js` e `mangas.js`;
- atributo `datetime` nos elementos `time` que ainda não o têm;
- atualização assistida das sinopses em português;
- mensagens que diferenciem falha de rede, timeout e limite 429 de forma mais granular no front-end;
- fontes locais ou pilha de sistema para independência visual da rede.

## Créditos e dependências externas

- dados de anime e referências do MyAnimeList: [Jikan API](https://jikan.moe/);
- agenda, capas e banners: [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/);
- dados de mangá, capas e capítulos: [MangaDex API](https://api.mangadex.org/docs/);
- tradução automática de descrições de mangá: [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php);
- tipografia do site: Google Fonts.

Este projeto depende da disponibilidade e das políticas desses serviços. Os créditos não significam afiliação
oficial.

## Licença

Projeto pessoal. © 2026 Shalana Xavier. Todos os direitos reservados.
