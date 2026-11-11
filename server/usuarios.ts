import { BASES, GERENCIAS } from "../src/shared/constantes";
import { ehDesenvolvedor, hashSenha, type Sessao } from "./auth";
import { sql } from "./db";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);
const limpa = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

async function listar() {
  const rs = (await sql`SELECT id, usuario, nome, chapa, funcao, base, gerencia, processo, admin, ativo FROM escola_usuarios ORDER BY nome, usuario`) as any[];
  return rs.map((u) => ({ ...u, desenvolvedor: ehDesenvolvedor(u.usuario) }));
}

const nomeAcesso = (v: unknown) => {
  const s = limpa(v, 40).replace(/\s/g, "");
  return s ? (s.startsWith("@") ? s : `@${s}`) : "";
};

/** Valida os campos enviados; `parcial` aceita só o que veio (para ativar/desativar e dar perfil direto da lista). */
function campos(b: any, parcial: boolean): { ok: Record<string, unknown> } | { erro: string } {
  const ok: Record<string, unknown> = {};
  const tem = (k: string) => b && b[k] !== undefined;
  if (!parcial || tem("usuario")) {
    const u = nomeAcesso(b?.usuario);
    if (u.length < 4) return { erro: "Informe o usuário de acesso (mínimo de 3 caracteres)." };
    ok.usuario = u;
  }
  if (!parcial || tem("nome")) {
    const n = limpa(b?.nome, 100).toUpperCase();
    if (n.split(" ").length < 2) return { erro: "Informe o nome completo." };
    ok.nome = n;
  }
  for (const [k, max] of [["chapa", 20], ["funcao", 80], ["processo", 60]] as const) {
    if (!parcial || tem(k)) ok[k] = limpa(b?.[k], max).toUpperCase();
  }
  if (!parcial || tem("base")) {
    const v = limpa(b?.base, 10).toUpperCase();
    if (v && !(BASES as readonly string[]).includes(v)) return { erro: "Base inválida." };
    ok.base = v;
  }
  if (!parcial || tem("gerencia")) {
    const v = limpa(b?.gerencia, 12).toUpperCase();
    if (v && !(GERENCIAS as readonly string[]).includes(v)) return { erro: "Gerência inválida." };
    ok.gerencia = v;
  }
  if (tem("admin")) ok.admin = b.admin === true;
  if (tem("ativo")) ok.ativo = b.ativo === true;
  return { ok };
}

function senhaValida(s: unknown): string | null {
  const v = String(s ?? "");
  if (v.length < 4) return "A senha precisa ter pelo menos 4 caracteres.";
  if (v.length > 100) return "A senha é longa demais.";
  return null;
}

async function outrosAdmins(idExcluido: number) {
  const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM escola_usuarios WHERE admin AND ativo AND id <> ${idExcluido}`) as { n: number }[];
  return n;
}

export async function rotasUsuarios(req: Request, rota: string, eu: Sessao): Promise<Response | null> {
  if (rota === "/api/admin/usuarios" && req.method === "GET") return json({ usuarios: await listar() });

  if (rota === "/api/admin/usuarios" && req.method === "POST") {
    const b = await req.json().catch(() => null);
    const c = campos(b, false);
    if ("erro" in c) return erro(c.erro);
    const e = senhaValida(b?.senha);
    if (e) return erro(e);
    const u = c.ok as any;
    const [dup] = (await sql`SELECT 1 FROM escola_usuarios WHERE usuario_norm = ${u.usuario.toLowerCase()}`) as unknown[];
    if (dup || ehDesenvolvedor(u.usuario)) return erro("Já existe um usuário com este nome de acesso.", 409);
    const [novo] = (await sql`
      INSERT INTO escola_usuarios (usuario, usuario_norm, senha_hash, nome, chapa, funcao, base, gerencia, processo, admin, ativo)
      VALUES (${u.usuario}, ${u.usuario.toLowerCase()}, ${hashSenha(String(b.senha))}, ${u.nome}, ${u.chapa}, ${u.funcao}, ${u.base}, ${u.gerencia}, ${u.processo}, ${u.admin === true}, ${u.ativo !== false})
      RETURNING id`) as { id: number }[];
    return json({ ok: true, id: novo!.id });
  }

  const m = /^\/api\/admin\/usuarios\/(\d+)$/.exec(rota);
  if (!m) return null;
  const id = Number(m[1]);
  const [atual] = (await sql`SELECT * FROM escola_usuarios WHERE id = ${id}`) as any[];
  if (!atual) return erro("Usuário não encontrado.", 404);
  const proprio = atual.usuario_norm === eu.usuario.toLowerCase();
  const dev = ehDesenvolvedor(atual.usuario);

  if (req.method === "DELETE") {
    if (proprio) return erro("Você não pode excluir o seu próprio acesso.");
    if (dev) return erro("Esta é a conta do desenvolvedor e não pode ser excluída.");
    if (atual.admin && atual.ativo && !(await outrosAdmins(id))) return erro("Mantenha pelo menos um administrador ativo.");
    await sql`DELETE FROM escola_usuarios WHERE id = ${id}`;
    return json({ ok: true });
  }

  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    const c = campos(b, true);
    if ("erro" in c) return erro(c.erro);
    const novo = { ...atual, ...(c.ok as any) };

    if ("usuario" in c.ok) {
      if (proprio && novo.usuario.toLowerCase() !== atual.usuario_norm) return erro("Você não pode alterar o seu próprio usuário de acesso.");
      if (dev && novo.usuario.toLowerCase() !== atual.usuario_norm) return erro("O usuário do desenvolvedor não pode ser alterado.");
      const [dup] = (await sql`SELECT 1 FROM escola_usuarios WHERE usuario_norm = ${novo.usuario.toLowerCase()} AND id <> ${id}`) as unknown[];
      if (dup || (!dev && ehDesenvolvedor(novo.usuario))) return erro("Já existe um usuário com este nome de acesso.", 409);
    }
    const perdeAdmin = atual.admin && atual.ativo && (!novo.admin || !novo.ativo);
    if (perdeAdmin) {
      if (proprio) return erro("Você não pode remover o seu próprio acesso de administrador nem desativar a sua conta.");
      if (dev) return erro("A conta do desenvolvedor é sempre administradora e ativa.");
      if (!(await outrosAdmins(id))) return erro("Mantenha pelo menos um administrador ativo.");
    }

    let hash: string | null = null;
    if (b?.senha !== undefined && String(b.senha) !== "") {
      const e = senhaValida(b.senha);
      if (e) return erro(e);
      hash = hashSenha(String(b.senha));
    }
    await sql`
      UPDATE escola_usuarios SET usuario = ${novo.usuario}, usuario_norm = ${novo.usuario.toLowerCase()}, nome = ${novo.nome}, chapa = ${novo.chapa},
        funcao = ${novo.funcao}, base = ${novo.base}, gerencia = ${novo.gerencia}, processo = ${novo.processo}, admin = ${novo.admin}, ativo = ${novo.ativo},
        senha_hash = COALESCE(${hash}, senha_hash)
      WHERE id = ${id}`;
    return json({ ok: true });
  }

  return null;
}
