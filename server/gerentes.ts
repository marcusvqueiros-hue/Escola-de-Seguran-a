import { sql } from "./db";

import { REGRAS_COORDENADORES as REGRAS_GERENTES, gerenteDe } from "../src/shared/coordenadores";

export { gerenteDe };

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
