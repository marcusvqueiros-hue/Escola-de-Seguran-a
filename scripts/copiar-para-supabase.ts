/**
 * Copia os dados do Neon para o Supabase (via API REST, com a service_role).
 * Antes, rode supabase/schema.sql no SQL Editor do Supabase.
 *
 * Uso: DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run supabase:copiar
 */
import { sql } from "../server/db";

const base = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !chave) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");

const LOTE = 200;

async function enviar(tabela: string, linhas: Record<string, unknown>[], conflito: string) {
  for (let i = 0; i < linhas.length; i += LOTE) {
    const r = await fetch(`${base}/rest/v1/${tabela}?on_conflict=${conflito}`, {
      method: "POST",
      headers: {
        apikey: chave!,
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(linhas.slice(i, i + LOTE)),
    });
    if (!r.ok) throw new Error(`${tabela}: ${r.status} ${await r.text()}`);
  }
  console.log(`${tabela}: ${linhas.length} linhas`);
}

async function contar(tabela: string) {
  const r = await fetch(`${base}/rest/v1/${tabela}?select=id`, {
    method: "HEAD",
    headers: { apikey: chave!, Authorization: `Bearer ${chave}`, Prefer: "count=exact" },
  });
  return r.headers.get("content-range");
}

await enviar("escola_colaboradores", (await sql`SELECT * FROM colaboradores ORDER BY id`) as any[], "id");
await enviar("escola_tentativas", (await sql`SELECT * FROM tentativas`) as any[], "id");
await enviar("escola_fotos", (await sql`SELECT * FROM fotos`) as any[], "id");

for (const t of ["escola_colaboradores", "escola_tentativas", "escola_fotos"]) console.log(t, "no Supabase:", await contar(t));
