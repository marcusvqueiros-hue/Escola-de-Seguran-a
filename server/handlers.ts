import { randomUUID } from "node:crypto";
import { iniciarBanco, sql } from "./db";
import { corrigir } from "./gabarito";
import { autenticado, cookieLimpo, cookieSessao, tentarLogin } from "./auth";
import {
  BASES,
  DURACAO_SEG,
  GERENCIAS,
  HORAS_POR_PARTICIPACAO,
  NOTA_MINIMA,
  TOLERANCIA_FOTO_SEG,
  type Registro,
  type Resposta,
} from "../src/shared/constantes";
import { QUESTOES } from "../src/shared/questoes";
import { chaveNome } from "../src/shared/texto";
import { rotasColaboradores } from "./colaboradores";
import { gerenteDe } from "../src/shared/coordenadores";

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);

const limpa = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LETRAS = new Set(["A", "B", "C", "D"]);
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

  const id = randomUUID();
  await sql`INSERT INTO escola_tentativas (id, iniciada_em, nome, matricula, prefixo, funcao, base, gerencia)
            VALUES (${id}, ${new Date().toISOString()}, ${nome}, ${matricula}, ${prefixo}, ${funcao}, ${base}, ${gerencia})`;
  return json({ id, duracaoSeg: DURACAO_SEG });
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

  const respostas: (Resposta | null)[] = QUESTOES.map((_, i) => {
    const r = Array.isArray(b.respostas) ? b.respostas[i] : null;
    return LETRAS.has(r) ? (r as Resposta) : null;
  });

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
          duracao_seg = ${Math.min(decorrido, DURACAO_SEG)}, tem_foto = TRUE, local = ${local}, lat = ${lat}, lng = ${lng},
          carimbo = ${limpa(b.carimbo, 40)} WHERE id = ${t.id}`,
  ]);

  await sql`UPDATE escola_colaboradores SET prefixo = ${t.prefixo} WHERE nome_norm = ${chaveNome(t.nome)}`;

  const { nota } = corrigir(respostas);
  return json({ nota, total: QUESTOES.length, aprovado: nota >= NOTA_MINIMA, notaMinima: NOTA_MINIMA });
}

async function registros(): Promise<Registro[]> {
  const linhas = (await sql`SELECT * FROM escola_tentativas WHERE finalizada_em IS NOT NULL ORDER BY finalizada_em`) as any[];
  // coordenador: o do cadastro (pelo nome); sem cadastro, o da regra de gerência e base
  const cadastro = new Map(((await sql`SELECT nome_norm, gerente FROM escola_colaboradores`) as { nome_norm: string; gerente: string | null }[]).map((c) => [c.nome_norm, c.gerente ?? ""]));
  return linhas.map((l) => {
    const respostas = JSON.parse(l.respostas ?? "[]") as (Resposta | null)[];
    const { acertos, nota } = corrigir(respostas);
    return {
      id: l.id,
      data: l.finalizada_em,
      nome: l.nome,
      matricula: l.matricula,
      prefixo: l.prefixo,
      funcao: l.funcao,
      base: l.base,
      gerencia: l.gerencia,
      respostas,
      acertos,
      nota,
      aprovado: nota >= NOTA_MINIMA,
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
    if (rota === "/api/avaliacao/iniciar" && req.method === "POST") return await iniciar(req);
    if (rota === "/api/avaliacao/finalizar" && req.method === "POST") return await finalizar(req);

    if (rota === "/api/admin/login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const r = await tentarLogin(ipDe(req), String(b.usuario ?? ""), String(b.senha ?? ""));
      if (!r.token) return erro(r.erro ?? "Falha no login.", 401);
      return json({ ok: true }, 200, { "Set-Cookie": cookieSessao(r.token, req) });
    }
    if (rota === "/api/admin/logout" && req.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": cookieLimpo });
    if (rota === "/api/admin/sessao") return json({ autenticado: autenticado(req) });

    if (rota.startsWith("/api/admin/")) {
      if (!autenticado(req)) return erro("Não autorizado.", 401);
      const colab = await rotasColaboradores(req, rota);
      if (colab) return colab;
      if (rota === "/api/admin/registros") return json({ registros: await registros(), notaMinima: NOTA_MINIMA });
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
