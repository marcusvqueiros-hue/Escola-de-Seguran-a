/**
 * Coordenador (responsável) de cada colaborador, conforme gerência e base.
 * `bases` ausente = vale para todas as bases da gerência. Nomes como informados pela operação.
 */
export const REGRAS_COORDENADORES: { gerencia: string; bases?: string[]; gerente: string }[] = [
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

export const COORDENADORES = [...new Set(REGRAS_COORDENADORES.map((r) => r.gerente))];

export function gerenteDe(gerencia: string, base: string): string {
  const r = REGRAS_COORDENADORES.find((x) => x.gerencia === gerencia && (!x.bases || x.bases.includes(base)));
  return r?.gerente ?? "";
}
