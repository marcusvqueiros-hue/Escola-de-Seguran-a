// Uso: bun run colaboradores "<planilha>.xlsx"
// Lê a aba "Base" (CHAPA, NOME, FUNÇÃO, BASE, PROCESSO, GERENCIA, SITUAÇÃO) e substitui o cadastro de colaboradores
// no banco (DATABASE_URL, de .env.local). Quem aparece em mais de uma linha (vários processos) entra uma vez só.
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";
import { chaveNome } from "../src/shared/texto";
import { BASES, GERENCIAS } from "../src/shared/constantes";

const arquivo = process.argv[2];
if (!arquivo) throw new Error('Informe a planilha: bun run colaboradores "arquivo.xlsx"');
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL não encontrada (rode: vercel env pull .env.local).");

const wb = XLSX.read(await Bun.file(arquivo).arrayBuffer());
const aba = wb.Sheets["Base"] ?? wb.Sheets[wb.SheetNames[0]!]!;
const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba, { defval: "" });
const txt = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

const porChapa = new Map<string, { nome: string; norm: string; chapa: string; funcao: string; base: string; gerencia: string; situacao: string }>();
const avisos: string[] = [];
for (const r of linhas) {
  const chapa = txt(r["CHAPA"]);
  const nome = txt(r["NOME"]).toUpperCase();
  if (!chapa || !nome) continue;
  if (porChapa.has(chapa)) continue;
  const base = txt(r["BASE"]).toUpperCase();
  const gerencia = txt(r["GERENCIA"]).toUpperCase();
  if (!(BASES as readonly string[]).includes(base)) avisos.push(`${chapa} ${nome}: base "${base}" fora da lista`);
  if (!(GERENCIAS as readonly string[]).includes(gerencia)) avisos.push(`${chapa} ${nome}: gerência "${gerencia}" fora da lista`);
  porChapa.set(chapa, { nome, norm: chaveNome(nome), chapa, funcao: txt(r["FUNÇÃO"]).toUpperCase(), base, gerencia, situacao: txt(r["SITUAÇÃO"]).toUpperCase() });
}
const pessoas = [...porChapa.values()];
const vistos = new Set<string>();
const unicos = pessoas.filter((p) => (vistos.has(p.norm) ? (avisos.push(`nome repetido com outra chapa: ${p.chapa} ${p.nome}`), false) : (vistos.add(p.norm), true)));

const sql = neon(url);
await sql`ALTER TABLE escola_colaboradores ADD COLUMN IF NOT EXISTS situacao TEXT`;
await sql.transaction([
  sql`DELETE FROM escola_colaboradores`,
  sql`INSERT INTO escola_colaboradores (nome, nome_norm, matricula, prefixo, funcao, base, gerencia, situacao)
      SELECT * FROM unnest(${unicos.map((p) => p.nome)}::text[], ${unicos.map((p) => p.norm)}::text[], ${unicos.map((p) => p.chapa)}::text[],
        ${unicos.map(() => "")}::text[], ${unicos.map((p) => p.funcao)}::text[], ${unicos.map((p) => p.base)}::text[],
        ${unicos.map((p) => p.gerencia)}::text[], ${unicos.map((p) => p.situacao)}::text[])`,
]);

const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM escola_colaboradores`) as { n: number }[];
console.log(`${linhas.length} linhas na planilha → ${unicos.length} colaboradores únicos; ${n} no banco.`);
if (avisos.length) console.log(`Avisos (${avisos.length}):\n  ${avisos.slice(0, 15).join("\n  ")}`);
