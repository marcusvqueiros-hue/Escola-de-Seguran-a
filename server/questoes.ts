import { sql } from "./db";
import type { QuestaoAdmin, Resposta } from "../src/shared/constantes";

const LETRAS: Resposta[] = ["A", "B", "C", "D"];
const MAX_OPCOES = LETRAS.length;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);
const limpa = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export interface QuestaoBD {
  id: number;
  ordem: number;
  enunciado: string;
  opcoes: string[];
  correta: Resposta;
  ativa: boolean;
}

const doBanco = (r: any): QuestaoBD => ({ id: r.id, ordem: r.ordem, enunciado: r.enunciado, opcoes: JSON.parse(r.opcoes), correta: r.correta, ativa: r.ativa });

export async function listarQuestoes(): Promise<QuestaoBD[]> {
  return ((await sql`SELECT * FROM escola_questoes ORDER BY ordem, id`) as any[]).map(doBanco);
}

export const questoesAtivas = async () => (await listarQuestoes()).filter((q) => q.ativa);

/** Quantas avaliações finalizadas receberam cada questão. */
async function usosPorQuestao() {
  const rs = (await sql`
    SELECT q.id::int AS id, COUNT(*)::int AS n
    FROM escola_tentativas t, jsonb_array_elements_text(t.questoes::jsonb) AS q(id)
    WHERE t.finalizada_em IS NOT NULL AND t.questoes IS NOT NULL
    GROUP BY 1`) as { id: number; n: number }[];
  return new Map(rs.map((r) => [r.id, r.n]));
}

function validar(b: any): { enunciado: string; opcoes: string[]; correta: Resposta; ativa: boolean } | string {
  const enunciado = limpa(b?.enunciado, 600);
  if (enunciado.length < 5) return "Escreva o enunciado da questão.";
  const todas: string[] = Array.isArray(b?.opcoes) ? b.opcoes.slice(0, MAX_OPCOES).map((o: unknown) => limpa(o, 400)) : [];
  while (todas.length && !todas[todas.length - 1]) todas.pop();
  if (todas.length < 2) return "Informe pelo menos duas alternativas.";
  if (todas.some((o) => !o)) return "Preencha todas as alternativas ou remova as vazias do final.";
  const correta = String(b?.correta ?? "").toUpperCase() as Resposta;
  if (!LETRAS.slice(0, todas.length).includes(correta)) return "Marque qual alternativa é a correta.";
  return { enunciado, opcoes: todas, correta, ativa: b?.ativa !== false };
}

/** Recalcula o acerto desta questão nas avaliações já feitas, com a resposta correta atual. */
async function reaplicarGabarito(id: number, correta: Resposta) {
  const rs = (await sql`
    SELECT id, respostas, questoes, acertos FROM escola_tentativas
    WHERE finalizada_em IS NOT NULL AND questoes IS NOT NULL AND acertos IS NOT NULL AND questoes::jsonb @> ${JSON.stringify([id])}::jsonb`) as any[];
  const ops = rs.flatMap((t) => {
    const ids = JSON.parse(t.questoes) as number[];
    const pos = ids.indexOf(id);
    if (pos < 0) return [];
    const respostas = JSON.parse(t.respostas ?? "[]") as (string | null)[];
    const acertos = JSON.parse(t.acertos) as boolean[];
    acertos[pos] = respostas[pos] === correta;
    return [sql`UPDATE escola_tentativas SET acertos = ${JSON.stringify(acertos)} WHERE id = ${t.id}`];
  });
  if (ops.length) await sql.transaction(ops);
  return ops.length;
}

export async function rotasQuestoes(req: Request, rota: string): Promise<Response | null> {
  if (rota === "/api/admin/questoes" && req.method === "GET") {
    const usos = await usosPorQuestao();
    const questoes: QuestaoAdmin[] = (await listarQuestoes()).map((q) => ({ ...q, usos: usos.get(q.id) ?? 0 }));
    return json({ questoes });
  }

  if (rota === "/api/admin/questoes" && req.method === "POST") {
    const v = validar(await req.json().catch(() => null));
    if (typeof v === "string") return erro(v);
    const [{ prox }] = (await sql`SELECT COALESCE(MAX(ordem), 0)::int + 1 AS prox FROM escola_questoes`) as { prox: number }[];
    const [nova] = (await sql`
      INSERT INTO escola_questoes (ordem, enunciado, opcoes, correta, ativa)
      VALUES (${prox}, ${v.enunciado}, ${JSON.stringify(v.opcoes)}, ${v.correta}, ${v.ativa}) RETURNING id`) as { id: number }[];
    return json({ ok: true, id: nova!.id });
  }

  const m = /^\/api\/admin\/questoes\/(\d+)(\/mover)?$/.exec(rota);
  if (!m) return null;
  const id = Number(m[1]);
  const [atual] = (await sql`SELECT * FROM escola_questoes WHERE id = ${id}`) as any[];
  if (!atual) return erro("Questão não encontrada.", 404);

  if (m[2] && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    const todas = await listarQuestoes();
    const i = todas.findIndex((q) => q.id === id);
    const j = b?.direcao === "cima" ? i - 1 : b?.direcao === "baixo" ? i + 1 : -1;
    if (j < 0 || j >= todas.length) return json({ ok: true });
    // renumera a lista inteira, trocando as duas vizinhas
    const nova = [...todas];
    [nova[i], nova[j]] = [nova[j]!, nova[i]!];
    await sql.transaction(nova.map((q, k) => sql`UPDATE escola_questoes SET ordem = ${k + 1} WHERE id = ${q.id}`));
    return json({ ok: true });
  }

  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    const v = validar(b);
    if (typeof v === "string") return erro(v);
    if (!v.ativa && atual.ativa) {
      const [{ outras }] = (await sql`SELECT COUNT(*)::int AS outras FROM escola_questoes WHERE ativa AND id <> ${id}`) as { outras: number }[];
      if (!outras) return erro("Mantenha pelo menos uma questão ativa.");
    }
    await sql`UPDATE escola_questoes SET enunciado = ${v.enunciado}, opcoes = ${JSON.stringify(v.opcoes)}, correta = ${v.correta}, ativa = ${v.ativa} WHERE id = ${id}`;
    const reaplicadas = b?.reaplicar === true ?await reaplicarGabarito(id, v.correta) : 0;
    return json({ ok: true, reaplicadas });
  }

  return null;
}
