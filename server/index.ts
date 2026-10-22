// Servidor local (bun run dev). Em produção na Vercel, o front é estático e a API roda em api/[...slug].ts.
import index from "../index.html";
import { api } from "./handlers";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? "0.0.0.0",
  maxRequestBodySize: 12 * 1024 * 1024,
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/api/*": (req) => api(req),
    "/*": index,
  },
});

console.log(`Escola de Segurança no ar:
  Avaliação  → http://localhost:${server.port}/
  Dashboard  → http://localhost:${server.port}/painel`);
