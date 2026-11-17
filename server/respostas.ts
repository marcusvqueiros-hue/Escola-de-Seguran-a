import { BASES, GERENCIAS, QUESTOES_ORIGINAIS, type Resposta } from "../src/shared/constantes";
import { sql } from "./db";
import { listarQuestoes } from "./questoes";
import { registros } from "./registros";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);
const limpa = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LETRAS: Resposta[] = ["A", "B", "C", "D"];

/** Banco de respostas: lista, ajuste e exclusão das avaliações finalizadas (administradores). */
export async function rotasRespostas(req: Request, rota: string): Promise<Response | null> {
  if (rota === "/api/admin/respostas" && req.method === "GET") {
    const extras = new Map(
      ((await sql`SELECT id, origem, iniciada_em, duracao_seg FROM escola_tentativas WHERE finalizada_em IS NOT NULL`) as any[]).map((t) => [t.id, t]),
    );
    const lista = (await registros())
      .map((r) => ({ ...r, origem: extras.get(r.id)?.origem ?? "app", iniciadaEm: extras.get(r.id)?.iniciada_em ?? null, duracaoSeg: extras.get(r.id)?.duracao_seg ?? null }))
      .sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
    const questoes = (await listarQuestoes()).map((q, i) => ({ id: q.id, numero: i + 1, enunciado: q.enunciado, opcoes: q.opcoes, correta: q.correta, ativa: q.ativa }));
    return json({ registros: lista, questoes });
  }

  // exclusão em lote
  if (rota === "/api/admin/respostas/excluir" && req.method === "POST") {
    const b = await req.json().catch(() => null);
    const ids: string[] = Array.isArray(b?.ids) ? b.ids.map((x: unknown) => String(x)).slice(0, 500) : [];
    if (!ids.length) return erro("Nenhum registro selecionado.");
    await sql.transaction([
      sql`DELETE FROM escola_fotos WHERE id = ANY(${ids}::text[])`,
      sql`DELETE FROM escola_tentativas WHERE id = ANY(${ids}::text[]) AND finalizada_em IS NOT NULL`,
    ]);
    return json({ ok: true, excluidos: ids.length });
  }

  const m = /^\/api\/admin\/respostas\/([\w-]+)$/.exec(rota);
  if (!m) return null;
  const id = m[1]!;
  const [t] = (await sql`SELECT * FROM escola_tentativas WHERE id = ${id} AND finalizada_em IS NOT NULL`) as any[];
  if (!t) return erro("Registro não encontrado.", 404);

  if (req.method === "DELETE") {
    await sql.transaction([sql`DELETE FROM escola_fotos WHERE id = ${id}`, sql`DELETE FROM escola_tentativas WHERE id = ${id}`]);
    return json({ ok: true });
  }

  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    if (!b) return erro("Requisição inválida.");

    const nome = limpa(b.nome, 100).toUpperCase();
    if (nome.split(" ").length < 2) return erro("Informe o nome completo.");
    const base = limpa(b.base, 10).toUpperCase();
    const gerencia = limpa(b.gerencia, 12).toUpperCase();
    if (base && !(BASES as readonly string[]).includes(base)) return erro("Base inválida.");
    if (gerencia && !(GERENCIAS as readonly string[]).includes(gerencia)) return erro("Gerência inválida.");

    let data: string | null = null;
    if (b.data) {
      const ms = Date.parse(String(b.data));
      if (!Number.isFinite(ms)) return erro("Data inválida.");
      data = new Date(ms).toISOString();
    }

    // as questões são as que a pessoa recebeu; ao ajustar respostas, o acerto é recalculado com o gabarito atual
    const ids: number[] = t.questoes ? JSON.parse(t.questoes) : QUESTOES_ORIGINAIS;
    let respostas: string = t.respostas ?? "[]";
    let acertos: string | null = t.acertos;
    if (Array.isArray(b.respostas)) {
      if (b.respostas.length !== ids.length) return erro("Número de respostas diferente do número de questões da avaliação.");
      const info = new Map(
        ((await sql`SELECT id, correta, opcoes FROM escola_questoes WHERE id = ANY(${ids}::int[])`) as { id: number; correta: string; opcoes: string }[]).map((q) => [q.id, { correta: q.correta, n: (JSON.parse(q.opcoes) as string[]).length }]),
      );
      const novas: (Resposta | null)[] = [];
      for (let i = 0; i < ids.length; i++) {
        const r = b.respostas[i];
        if (r === null || r === "" || r === undefined) novas.push(null);
        else if (LETRAS.includes(r) && LETRAS.indexOf(r) < (info.get(ids[i]!)?.n ?? 0)) novas.push(r);
        else return erro(`Resposta inválida na questão ${i + 1}.`);
      }
      respostas = JSON.stringify(novas);
      acertos = JSON.stringify(ids.map((qid, i) => novas[i] === info.get(qid)?.correta));
    }

    await sql`
      UPDATE escola_tentativas SET nome = ${nome}, matricula = ${limpa(b.matricula, 20)}, prefixo = ${limpa(b.prefixo, 30).toUpperCase()},
        funcao = ${limpa(b.funcao, 80).toUpperCase()}, base = ${base}, gerencia = ${gerencia},
        finalizada_em = COALESCE(${data}, finalizada_em), respostas = ${respostas}, questoes = ${JSON.stringify(ids)}, acertos = ${acertos}
      WHERE id = ${id}`;
    return json({ ok: true });
  }

  return null;
}
