import { sql } from "./db";
import { BASES, GERENCIAS } from "../src/shared/constantes";
import { chaveNome } from "../src/shared/texto";
import { aplicarRegraGerentes, gerenteDe } from "./gerentes";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);

export interface Colab {
  id?: number;
  chapa: string;
  nome: string;
  funcao: string;
  base: string;
  gerencia: string;
  gerente: string;
  situacao: string;
}

const txt = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function limpar(b: any): Colab {
  return {
    chapa: txt(b?.chapa, 20),
    nome: txt(b?.nome, 100).toUpperCase(),
    funcao: txt(b?.funcao, 100).toUpperCase(),
    base: txt(b?.base, 20).toUpperCase(),
    gerencia: txt(b?.gerencia, 30).toUpperCase(),
    gerente: txt(b?.gerente, 100).toUpperCase(),
    situacao: txt(b?.situacao, 20).toUpperCase() || "ATIVO",
  };
}

/** Devolve o motivo da recusa ou null quando os dados são válidos. */
function validar(c: Colab): string | null {
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(c.chapa)) return "chapa ausente ou inválida";
  if (c.nome.split(" ").length < 2) return "nome incompleto";
  if (!c.funcao) return "função ausente";
  if (!(BASES as readonly string[]).includes(c.base)) return `base "${c.base || "—"}" não cadastrada`;
  if (!(GERENCIAS as readonly string[]).includes(c.gerencia)) return `gerência "${c.gerencia || "—"}" não cadastrada`;
  return null;
}

const linha = (l: any): Colab => ({
  id: l.id,
  chapa: l.matricula,
  nome: l.nome,
  funcao: l.funcao ?? "",
  base: l.base ?? "",
  gerencia: l.gerencia ?? "",
  gerente: l.gerente ?? "",
  situacao: l.situacao ?? "ATIVO",
});

const CAMPOS: [keyof Colab, string][] = [
  ["nome", "nome"],
  ["funcao", "função"],
  ["base", "base"],
  ["gerencia", "gerência"],
  ["gerente", "gerente"],
  ["situacao", "situação"],
];

async function importar(b: any) {
  const entrada: any[] = Array.isArray(b?.linhas) ? b.linhas : [];
  if (!entrada.length) return erro("A planilha não tem linhas para importar.");
  if (entrada.length > 5000) return erro("Planilha grande demais (máximo de 5.000 linhas).");
  const temGerente = !!b.temGerente;
  const aplicar = !!b.aplicar;
  const remover = !!b.remover;

  const invalidos: { linha: number; motivo: string }[] = [];
  const porChapa = new Map<string, Colab>();
  entrada.forEach((raw, i) => {
    const c = limpar(raw);
    if (!c.gerente) c.gerente = gerenteDe(c.gerencia, c.base);
    const motivo = validar(c);
    if (motivo) return invalidos.push({ linha: i + 2, motivo: `${c.chapa || "?"} ${c.nome || ""}: ${motivo}`.trim() });
    if (!porChapa.has(c.chapa)) porChapa.set(c.chapa, c); // várias linhas da mesma chapa (vários processos) valem uma só
  });
  const novoSet = [...porChapa.values()];

  const atuais = ((await sql`SELECT id, nome, matricula, funcao, base, gerencia, gerente, situacao FROM colaboradores`) as any[]).map(linha);
  const atualPorChapa = new Map(atuais.map((c) => [c.chapa, c]));

  const novos: Colab[] = [];
  const alterados: { c: Colab; id: number; mudancas: string[] }[] = [];
  const nomesUsados = new Map(atuais.map((c) => [chaveNome(c.nome), c.chapa]));
  const chapasNovoSet = new Set(novoSet.map((c) => c.chapa));
  const vistosNome = new Set<string>();

  for (const c of novoSet) {
    const norm = chaveNome(c.nome);
    const dono = nomesUsados.get(norm);
    if ((dono && dono !== c.chapa && chapasNovoSet.has(dono) === false) || vistosNome.has(norm)) {
      invalidos.push({ linha: 0, motivo: `${c.chapa} ${c.nome}: nome já cadastrado com outra chapa` });
      continue;
    }
    vistosNome.add(norm);
    const atual = atualPorChapa.get(c.chapa);
    if (!atual) {
      novos.push(c);
      continue;
    }
    const mudancas = CAMPOS.filter(([k]) => (k !== "gerente" || temGerente) && c[k] !== atual[k]).map(([k, rot]) => `${rot}: ${atual[k] || "—"} → ${c[k] || "—"}`);
    if (mudancas.length) alterados.push({ c, id: atual.id!, mudancas });
  }
  // quem aparece na planilha (mesmo com linha inválida) não é tratado como desligado
  const presentes = new Set(entrada.map((r) => txt(r?.chapa, 20)));
  const removidos = atuais.filter((c) => !presentes.has(c.chapa));

  if (aplicar) {
    const ops: ReturnType<typeof sql>[] = [];
    if (novos.length)
      ops.push(sql`INSERT INTO colaboradores (nome, nome_norm, matricula, prefixo, funcao, base, gerencia, gerente, situacao)
        SELECT * FROM unnest(${novos.map((c) => c.nome)}::text[], ${novos.map((c) => chaveNome(c.nome))}::text[], ${novos.map((c) => c.chapa)}::text[],
          ${novos.map(() => "")}::text[], ${novos.map((c) => c.funcao)}::text[], ${novos.map((c) => c.base)}::text[],
          ${novos.map((c) => c.gerencia)}::text[], ${novos.map((c) => c.gerente)}::text[], ${novos.map((c) => c.situacao)}::text[])`);
    if (alterados.length)
      ops.push(sql`UPDATE colaboradores AS t SET nome = v.nome, nome_norm = v.norm, funcao = v.funcao, base = v.base, gerencia = v.gerencia,
          gerente = CASE WHEN ${temGerente} THEN v.gerente ELSE t.gerente END, situacao = v.situacao
        FROM (SELECT * FROM unnest(${alterados.map((a) => a.id)}::int[], ${alterados.map((a) => a.c.nome)}::text[], ${alterados.map((a) => chaveNome(a.c.nome))}::text[],
          ${alterados.map((a) => a.c.funcao)}::text[], ${alterados.map((a) => a.c.base)}::text[], ${alterados.map((a) => a.c.gerencia)}::text[],
          ${alterados.map((a) => a.c.gerente)}::text[], ${alterados.map((a) => a.c.situacao)}::text[]) AS x(id, nome, norm, funcao, base, gerencia, gerente, situacao)) AS v
        WHERE t.id = v.id`);
    if (remover && removidos.length) ops.push(sql`DELETE FROM colaboradores WHERE id = ANY(${removidos.map((c) => c.id!)}::int[])`);
    if (ops.length) await sql.transaction(ops);
  }

  const amostra = <T,>(xs: T[]) => xs.slice(0, 60);
  return json({
    aplicado: aplicar,
    resumo: { lidos: entrada.length, novos: novos.length, alterados: alterados.length, removidos: removidos.length, invalidos: invalidos.length, semMudanca: novoSet.length - novos.length - alterados.length },
    novos: amostra(novos.map((c) => ({ chapa: c.chapa, nome: c.nome, base: c.base, gerencia: c.gerencia }))),
    alterados: amostra(alterados.map((a) => ({ chapa: a.c.chapa, nome: a.c.nome, mudancas: a.mudancas }))),
    removidos: amostra(removidos.map((c) => ({ chapa: c.chapa, nome: c.nome, base: c.base, gerencia: c.gerencia }))),
    invalidos: amostra(invalidos),
  });
}

/** Rotas administrativas do cadastro de colaboradores. Devolve null quando a rota não é deste módulo. */
export async function rotasColaboradores(req: Request, rota: string): Promise<Response | null> {
  if (rota === "/api/admin/colaboradores") {
    if (req.method === "GET") {
      const rs = (await sql`SELECT id, nome, matricula, funcao, base, gerencia, gerente, situacao FROM colaboradores ORDER BY nome_norm`) as any[];
      return json({ colaboradores: rs.map(linha), bases: BASES, gerencias: GERENCIAS });
    }
    if (req.method === "POST") {
      const c = limpar(await req.json().catch(() => null));
      if (!c.gerente) c.gerente = gerenteDe(c.gerencia, c.base);
      const motivo = validar(c);
      if (motivo) return erro(`Dados inválidos: ${motivo}.`);
      const [dup] = (await sql`SELECT 1 FROM colaboradores WHERE matricula = ${c.chapa} OR nome_norm = ${chaveNome(c.nome)}`) as unknown[];
      if (dup) return erro("Já existe colaborador com essa chapa ou esse nome.", 409);
      const [novo] = (await sql`INSERT INTO colaboradores (nome, nome_norm, matricula, prefixo, funcao, base, gerencia, gerente, situacao)
        VALUES (${c.nome}, ${chaveNome(c.nome)}, ${c.chapa}, '', ${c.funcao}, ${c.base}, ${c.gerencia}, ${c.gerente}, ${c.situacao}) RETURNING id`) as { id: number }[];
      return json({ ok: true, id: novo!.id }, 201);
    }
  }
  if (rota === "/api/admin/colaboradores/gerentes" && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    return json({ ok: true, alterados: await aplicarRegraGerentes(!!b?.somenteVazios) });
  }
  if (rota === "/api/admin/colaboradores/importar" && req.method === "POST") return importar(await req.json().catch(() => null));

  const id = Number(/^\/api\/admin\/colaboradores\/(\d+)$/.exec(rota)?.[1]);
  if (id) {
    if (req.method === "PUT") {
      const c = limpar(await req.json().catch(() => null));
      if (!c.gerente) c.gerente = gerenteDe(c.gerencia, c.base);
      const motivo = validar(c);
      if (motivo) return erro(`Dados inválidos: ${motivo}.`);
      const [dup] = (await sql`SELECT 1 FROM colaboradores WHERE id <> ${id} AND (matricula = ${c.chapa} OR nome_norm = ${chaveNome(c.nome)})`) as unknown[];
      if (dup) return erro("Outro colaborador já usa essa chapa ou esse nome.", 409);
      const r = (await sql`UPDATE colaboradores SET nome = ${c.nome}, nome_norm = ${chaveNome(c.nome)}, matricula = ${c.chapa}, funcao = ${c.funcao},
        base = ${c.base}, gerencia = ${c.gerencia}, gerente = ${c.gerente}, situacao = ${c.situacao} WHERE id = ${id} RETURNING id`) as unknown[];
      return r.length ? json({ ok: true }) : erro("Colaborador não encontrado.", 404);
    }
    if (req.method === "DELETE") {
      const r = (await sql`DELETE FROM colaboradores WHERE id = ${id} RETURNING id`) as unknown[];
      return r.length ? json({ ok: true }) : erro("Colaborador não encontrado.", 404);
    }
  }
  return null;
}
