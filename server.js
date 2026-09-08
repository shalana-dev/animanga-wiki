import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mangasRoutes from "./src/routes/mangas.routes.js";
import animesRoutes from "./src/routes/animes.routes.js";
import { rotaNaoEncontrada, tratarErro } from "./src/middlewares/error.middleware.js";

const app = express();
const PORTA = process.env.PORT || 3000;

// padrão 1 cobre Vercel/Railway/Render. mais de um proxy na frente? ajusta
// via TRUST_PROXY, senão o rate limit por IP vira todo mundo = 1 IP só
const TRUST_PROXY = process.env.TRUST_PROXY ?? 1;
app.set("trust proxy", Number.isNaN(Number(TRUST_PROXY)) ? TRUST_PROXY : Number(TRUST_PROXY));

app.disable("x-powered-by");

// sem ALLOWED_ORIGIN, zero CORS liberado (já é seguro assim, front e back são
// a mesma origem). só mexe se um dia separar os domínios
const ORIGEM_PERMITIDA = process.env.ALLOWED_ORIGIN;
if (ORIGEM_PERMITIDA) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGEM_PERMITIDA);
    res.setHeader("Vary", "Origin");
    next();
  });
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://cdn.myanimelist.net",
          "https://s4.anilist.co",
          "https://uploads.mangadex.org",
        ],
        // anime e mangá agora passam pelo back-end (/api); o navegador só fala
        // com a própria origem
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
);

const limitadorGeral = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em instantes." },
});

const limitadorBusca = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas buscas em pouco tempo. Aguarde um instante." },
});

app.use(express.json({ limit: "10kb" }));
app.use("/api", limitadorGeral);
app.use("/api/mangas", limitadorBusca);

app.use(express.static("public"));
app.use("/api", mangasRoutes);
app.use("/api", animesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(rotaNaoEncontrada);
app.use(tratarErro);

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});
