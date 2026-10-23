// Servidor local (bun run dev). Em produção na Vercel, o front é estático e a API roda em api/[...slug].ts.
import index from "../index.html";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { api } from "./handlers";

// Arquivos de public/ (manifestos, service worker, ícones) servidos na raiz, como na Vercel.
const estaticos: Record<string, () => Response> = {};
const varrer = (dir: string, prefixo = "") => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho, `${prefixo}/${nome}`);
    else estaticos[`${prefixo}/${nome}`] = () => new Response(Bun.file(caminho), { headers: nome === "sw.js" ? { "Cache-Control": "no-cache" } : {} });
  }
};
varrer("public");

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? "0.0.0.0",
  maxRequestBodySize: 12 * 1024 * 1024,
  development: process.env.NODE_ENV !== "production",
  routes: {
    ...estaticos,
    "/api/*": (req) => api(req),
    "/*": index,
  },
});

console.log(`Escola de Segurança no ar:
  Avaliação  → http://localhost:${server.port}/
  Relatórios → http://localhost:${server.port}/painel`);
