import { sql } from "./db";

/**
 * Quem é o gerente de cada colaborador, conforme gerência e base.
 * `bases` vazio = vale para todas as bases da gerência. Nomes como informados pela operação.
 */
export const REGRAS_GERENTES: { gerencia: string; bases?: string[]; gerente: string }[] = [
  { gerencia: "GOMAN", bases: ["BCB", "STI", "ITM"], gerente: "LUIS C." },
  { gerencia: "GOMAN", bases: ["PDS"], gerente: "THIAGO F." },
  { gerencia: "GOMAN", bases: ["PDT"], gerente: "RAFAELA" },
  { gerencia: "GOMAN", bases: ["BDC"], gerente: "JACKSON" },
  { gerencia: "GERE", gerente: "ANTONIO M." },
  { gerencia: "GSTC", bases: ["BCB", "ITM", "STI"], gerente: "AFONSO" },
  { gerencia: "GSTC", bases: ["PDS", "PDT", "BDC"], gerente: "PAULO" },
  { gerencia: "ADM", gerente: "PRYSCILLA" },
  { gerencia: "ALMOXARIFE", gerente: "CAMILA" },
  { gerencia: "FROTA", gerente: "RUAN" },
  { gerencia: "SESMT", gerente: "DANIEL" },
];

export function gerenteDe(gerencia: string, base: string): string {
  const r = REGRAS_GERENTES.find((x) => x.gerencia === gerencia && (!x.bases || x.bases.includes(base)));
  return r?.gerente ?? "";
}

/** Redefine o gerente de todos (ou só de quem está sem gerente) pela regra acima. Devolve quantos mudaram. */
export async function aplicarRegraGerentes(somenteVazios: boolean): Promise<number> {
  const linhas = REGRAS_GERENTES.flatMap((r) => (r.bases ?? ["*"]).map((b) => ({ gerencia: r.gerencia, base: b, gerente: r.gerente })));
  const rs = (await sql`
    UPDATE colaboradores AS c SET gerente = r.gerente
    FROM unnest(${linhas.map((l) => l.gerencia)}::text[], ${linhas.map((l) => l.base)}::text[], ${linhas.map((l) => l.gerente)}::text[]) AS r(gerencia, base, gerente)
    WHERE c.gerencia = r.gerencia AND (r.base = '*' OR c.base = r.base)
      AND c.gerente IS DISTINCT FROM r.gerente AND (${!somenteVazios} OR COALESCE(c.gerente, '') = '')
    RETURNING c.id`) as unknown[];
  return rs.length;
}
