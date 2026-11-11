import { randomUUID } from "node:crypto";
import { iniciarBanco, sql } from "./db";
import { GABARITO } from "./gabarito";
import { listarQuestoes, questoesAtivas, rotasQuestoes } from "./questoes";
import { cookieLimpo, cookieSessao, sessaoDe, tentarLogin } from "./auth";
import { rotasUsuarios } from "./usuarios";
import {
  BASES,
  DURACAO_SEG,
  GERENCIAS,
  HORAS_POR_PARTICIPACAO,
  NOTA_MINIMA,
  notaMinima,
  QUESTOES_ORIGINAIS,
  TOLERANCIA_FOTO_SEG,
  type Registro,
  type Resposta,
} from "../src/shared/constantes";
import { chaveNome } from "../src/shared/texto";
import { rotasColaboradores } from "./colaboradores";
import { gerenteDe } from "../src/shared/coordenadores";

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);

const limpa = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LETRAS_ARR = ["A", "B", "C", "D"] as const;
const LETRAS = new Set<string>(LETRAS_ARR);
const ipDe = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

async function iniciar(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return erro("Requisição inválida.");
  const nome = limpa(b.nome, 100).toUpperCase();
  const matricula = limpa(b.matricula, 20);
  const prefixo = limpa(b.prefixo, 30).toUpperCase();
  const funcao = limpa(b.funcao, 80).toUpperCase();
  const base = limpa(b.base, 10).toUpperCase();
  const gerencia = limpa(b.gerencia, 10).toUpperCase();

  if (nome.split(" ").length < 2) return erro("Informe o nome completo.");
  if (!matricula || !prefixo || !funcao) return erro("Preencha todos os campos.");
  if (!(BASES as readonly string[]).includes(base)) return erro("Base inválida.");
  if (!(GERENCIAS as readonly string[]).includes(gerencia)) return erro("Coordenação inválida.");

  const ativas = await questoesAtivas();
  if (!ativas.length) return erro("Nenhuma questão disponível no momento.", 503);

  const id = randomUUID();
  await sql`INSERT INTO escola_tentativas (id, iniciada_em, nome, matricula, prefixo, funcao, base, gerencia, questoes)
            VALUES (${id}, ${new Date().toISOString()}, ${nome}, ${matricula}, ${prefixo}, ${funcao}, ${base}, ${gerencia}, ${JSON.stringify(ativas.map((q) => q.id))})`;
  // a resposta correta nunca sai do servidor
  const questoes = ativas.map((q) => ({ id: q.id, enunciado: q.enunciado, opcoes: q.opcoes.map((texto, i) => ({ letra: LETRAS_ARR[i]!, texto })) }));
  return json({ id, duracaoSeg: DURACAO_SEG, questoes });
}

async function finalizar(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return erro("Requisição inválida.");
  const [t] = (await sql`SELECT * FROM escola_tentativas WHERE id = ${limpa(b.id, 60)}`) as any[];
  if (!t || t.origem !== "app") return erro("Avaliação não encontrada.", 404);
  if (t.finalizada_em) return erro("Esta avaliação já foi finalizada.", 409);

  const agora = Date.now();
  const decorrido = Math.round((agora - Date.parse(t.iniciada_em)) / 1000);
  if (decorrido > DURACAO_SEG + TOLERANCIA_FOTO_SEG) return erro("O tempo da avaliação esgotou. Inicie novamente.", 410);

  // as questões são as que o colaborador recebeu ao iniciar; avaliações iniciadas antes do banco editável usam as originais
  const ids: number[] = t.questoes ? JSON.parse(t.questoes) : QUESTOES_ORIGINAIS;
  const corretas = new Map(
    ((await sql`SELECT id, correta, opcoes FROM escola_questoes WHERE id = ANY(${ids}::int[])`) as { id: number; correta: string; opcoes: string }[]).map((q) => [q.id, { correta: q.correta, n: (JSON.parse(q.opcoes) as string[]).length }]),
  );
  const respostas: (Resposta | null)[] = ids.map((id, i) => {
    const r = Array.isArray(b.respostas) ? b.respostas[i] : null;
    return LETRAS.has(r) && LETRAS_ARR.indexOf(r) < (corretas.get(id)?.n ?? 0) ? (r as Resposta) : null;
  });
  const acertos = ids.map((id, i) => respostas[i] === corretas.get(id)?.correta);

  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.foto ?? ""));
  if (!m) return erro("A foto é obrigatória para finalizar a avaliação.");
  const bytes = Buffer.from(m[1]!, "base64");
  if (bytes.length < 2000 || bytes.length > 3.5 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return erro("Foto inválida.");

  const local = limpa(b.local, 300);
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!local || !Number.isFinite(lat) || !Number.isFinite(lng)) return erro("A localização é obrigatória.");

  await sql.transaction([
    sql`INSERT INTO escola_fotos (id, dados) VALUES (${t.id}, ${m[1]!}) ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados`,
    sql`UPDATE escola_tentativas SET finalizada_em = ${new Date(agora).toISOString()}, respostas = ${JSON.stringify(respostas)},
          questoes = ${JSON.stringify(ids)}, acertos = ${JSON.stringify(acertos)},
          duracao_seg = ${Math.min(decorrido, DURACAO_SEG)}, tem_foto = TRUE, local = ${local}, lat = ${lat}, lng = ${lng},
          carimbo = ${limpa(b.carimbo, 40)} WHERE id = ${t.id}`,
  ]);

  await sql`UPDATE escola_colaboradores SET prefixo = ${t.prefixo} WHERE nome_norm = ${chaveNome(t.nome)}`;

  const nota = acertos.filter(Boolean).length;
  return json({ nota, total: ids.length, aprovado: nota >= notaMinima(ids.length), notaMinima: notaMinima(ids.length) });
}

async function registros(): Promise<Registro[]> {
  const linhas = (await sql`SELECT * FROM escola_tentativas WHERE finalizada_em IS NOT NULL ORDER BY finalizada_em`) as any[];
  // coordenador: o do cadastro (pelo nome); sem cadastro, o da regra de gerência e base
  const cadastro = new Map(((await sql`SELECT nome_norm, gerente FROM escola_colaboradores`) as { nome_norm: string; gerente: string | null }[]).map((c) => [c.nome_norm, c.gerente ?? ""]));
  return linhas.map((l) => {
    const respostas = JSON.parse(l.respostas ?? "[]") as (Resposta | null)[];
    const questoes: number[] = l.questoes ? JSON.parse(l.questoes) : QUESTOES_ORIGINAIS;
    const acertos: boolean[] = l.acertos ? JSON.parse(l.acertos) : GABARITO.map((g, i) => respostas[i] === g);
    const pontos = acertos.filter(Boolean).length;
    const total = acertos.length || 1;
    return {
      id: l.id,
      data: l.finalizada_em,
      nome: l.nome,
      matricula: l.matricula,
      prefixo: l.prefixo,
      funcao: l.funcao,
      base: l.base,
      gerencia: l.gerencia,
      questoes,
      respostas,
      acertos,
      // nota de 0 a 10, qualquer que seja o número de questões da época
      nota: total === 10 ? pontos : Math.round((pontos / total) * 1000) / 100,
      aprovado: pontos >= notaMinima(total),
      horas: HORAS_POR_PARTICIPACAO,
      coordenador: cadastro.get(chaveNome(l.nome)) || gerenteDe(l.gerencia, l.base),
      temFoto: l.tem_foto,
      local: l.local,
    };
  });
}

export async function api(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const rota = pathname.replace(/\/+$/, "");
  try {
    await iniciarBanco();

    if (rota === "/api/colaboradores" && req.method === "GET") {
      const q = chaveNome(new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
      const digitos = /^\d+$/.test(q);
      if (q.length < 2) return json({ resultados: [] });
      const seguro = q.replace(/[\\%_]/g, (m) => `\\${m}`);
      const padrao = `%${seguro}%`;
      const inicio = `${seguro}%`;
      const rs = digitos
        ? await sql`SELECT id, nome, base, matricula FROM escola_colaboradores WHERE matricula LIKE ${inicio} ORDER BY matricula LIMIT 8`
        : await sql`SELECT id, nome, base, matricula FROM escola_colaboradores WHERE nome_norm LIKE ${padrao}
                    ORDER BY (nome_norm LIKE ${inicio}) DESC, nome_norm LIMIT 8`;
      return json({ resultados: rs });
    }
    const colab = /^\/api\/colaboradores\/(\d+)$/.exec(rota)?.[1];
    if (colab && req.method === "GET") {
      const [c] = (await sql`SELECT nome, matricula, prefixo, funcao, base, gerencia FROM escola_colaboradores WHERE id = ${Number(colab)}`) as any[];
      return c ? json(c) : erro("Colaborador não encontrado.", 404);
    }
    if (rota === "/api/avaliacao/info" && req.method === "GET") {
      const total = (await questoesAtivas()).length;
      return json({ total, notaMinima: notaMinima(total), duracaoSeg: DURACAO_SEG });
    }
    if (rota === "/api/avaliacao/iniciar" && req.method === "POST") return await iniciar(req);
    if (rota === "/api/avaliacao/finalizar" && req.method === "POST") return await finalizar(req);

    if (rota === "/api/admin/login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const r = await tentarLogin(ipDe(req), String(b.usuario ?? ""), String(b.senha ?? ""));
      if (!r.token) return erro(r.erro ?? "Falha no login.", 401);
      return json({ ok: true }, 200, { "Set-Cookie": cookieSessao(r.token, req) });
    }
    if (rota === "/api/admin/logout" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookieLimpo });
    if (rota === "/api/admin/sessao") return json({ autenticado: !!(await sessaoDe(req)) });

    if (rota.startsWith("/api/admin/")) {
      const eu = await sessaoDe(req);
      if (!eu) return erro("Não autorizado.", 401);
      // relatórios (registros e fotos) para qualquer usuário; o restante só para administradores
      if (/^\/api\/admin\/(colaboradores|questoes|usuarios)(\/|$)/.test(rota) && !eu.admin) return erro("Acesso restrito aos administradores.", 403);
      const usr = await rotasUsuarios(req, rota, eu);
      if (usr) return usr;
      const colab = await rotasColaboradores(req, rota);
      if (colab) return colab;
      const quest = await rotasQuestoes(req, rota);
      if (quest) return quest;
      if (rota === "/api/admin/registros") {
        const questoes = (await listarQuestoes()).map((q, i) => ({ id: q.id, numero: i + 1, enunciado: q.enunciado, ativa: q.ativa }));
        return json({ registros: await registros(), questoes, notaMinima: NOTA_MINIMA, eu: { nome: eu.nome, usuario: eu.usuario, admin: eu.admin } });
      }
      const id = /^\/api\/admin\/foto\/([\w-]+)$/.exec(rota)?.[1];
      if (id) {
        const [f] = (await sql`SELECT dados FROM escola_fotos WHERE id = ${id}`) as { dados: string }[];
        if (!f) return erro("Foto não encontrada.", 404);
        return new Response(Buffer.from(f.dados, "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
      }
    }
    return erro("Rota não encontrada.", 404);
  } catch (e) {
    console.error(e);
    return erro("Erro interno. Tente novamente.", 500);
  }
}
