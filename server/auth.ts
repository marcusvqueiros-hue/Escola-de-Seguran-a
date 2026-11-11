import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

const SESSAO_S = 12 * 60 * 60;

function config() {
  const usuario = process.env.ADMIN_USER;
  const senha = process.env.ADMIN_PASS;
  if (!usuario || !senha) throw new Error("ADMIN_USER e ADMIN_PASS precisam estar configuradas.");
  return { usuario, senha, segredo: process.env.SESSION_SECRET ?? `escola:${senha}` };
}

/** Conta do desenvolvedor (variáveis de ambiente): sempre administradora, mesmo que o banco mude. */
export const ehDesenvolvedor = (usuario: string) => !!process.env.ADMIN_USER && usuario.trim().toLowerCase() === process.env.ADMIN_USER.toLowerCase();

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Senha guardada como scrypt$<sal>$<hash>; nunca em texto puro. */
export function hashSenha(senha: string) {
  const sal = randomBytes(16).toString("hex");
  return ["scrypt", sal, scryptSync(senha, sal, 32).toString("hex")].join("$");
}

function confere(senha: string, guardado: string | undefined) {
  const [, sal, hash] = (guardado ?? "scrypt$00$00").split("$");
  const calc = scryptSync(senha, sal ?? "", 32).toString("hex");
  return !!guardado && igual(calc, hash ?? "");
}

const assinar = (corpo: string, segredo: string) => createHmac("sha256", segredo).update(corpo).digest("hex");
const b64 = (s: string) => Buffer.from(s).toString("base64url");

/** O cookie leva quem entrou (usuário em minúsculas); o perfil é lido do banco a cada requisição. */
function emitir(chave: string, segredo: string, agora: number) {
  const corpo = `${b64(chave)}.${Math.floor(agora / 1000) + SESSAO_S}`;
  return `${corpo}.${assinar(corpo, segredo)}`;
}

export async function tentarLogin(ip: string, usuario: string, senha: string): Promise<{ token?: string; erro?: string }> {
  const c = config();
  const agora = Date.now();
  const [f] = (await sql`SELECT n, ate FROM escola_falhas_login WHERE ip = ${ip}`) as { n: number; ate: string }[];
  const ativa = f && Number(f.ate) > agora;
  if (ativa && f!.n >= 5) return { erro: "Muitas tentativas. Aguarde alguns minutos." };

  const chave = usuario.trim().toLowerCase();
  const [u] = (await sql`SELECT senha_hash FROM escola_usuarios WHERE usuario_norm = ${chave} AND ativo`) as { senha_hash: string }[];
  const valido = confere(senha, u?.senha_hash) || (ehDesenvolvedor(usuario) && igual(senha, c.senha));

  if (!valido) {
    const n = (ativa ? f!.n : 0) + 1;
    await sql`INSERT INTO escola_falhas_login (ip, n, ate) VALUES (${ip}, ${n}, ${agora + 5 * 60 * 1000})
              ON CONFLICT (ip) DO UPDATE SET n = ${n}, ate = ${agora + 5 * 60 * 1000}`;
    return { erro: "Usuário ou senha inválidos." };
  }
  await sql`DELETE FROM escola_falhas_login WHERE ip = ${ip}`;
  return { token: emitir(chave, c.segredo, agora) };
}

export interface Sessao {
  usuario: string;
  nome: string;
  admin: boolean;
  desenvolvedor: boolean;
}

/** Quem está logado, com o perfil atual. Usuário removido ou desativado perde o acesso na hora. */
export async function sessaoDe(req: Request): Promise<Sessao | null> {
  const t = /(?:^|;\s*)sessao=([\w-]+\.\d+\.[a-f0-9]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!t) return null;
  const [chaveB64, exp, mac] = t.split(".") as [string, string, string];
  if (!(Number(exp) > Date.now() / 1000) || !igual(mac, assinar(`${chaveB64}.${exp}`, config().segredo))) return null;

  const chave = Buffer.from(chaveB64, "base64url").toString();
  const [u] = (await sql`SELECT usuario, nome, admin, ativo FROM escola_usuarios WHERE usuario_norm = ${chave}`) as { usuario: string; nome: string | null; admin: boolean; ativo: boolean }[];
  if (ehDesenvolvedor(chave)) return { usuario: u?.usuario ?? chave, nome: u?.nome || "Desenvolvedor", admin: true, desenvolvedor: true };
  if (!u || !u.ativo) return null;
  return { usuario: u.usuario, nome: u.nome || u.usuario, admin: u.admin, desenvolvedor: false };
}

const seguro = (req: Request) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

export const cookieSessao = (token: string, req: Request) =>
  `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSAO_S}${seguro(req) ? "; Secure" : ""}`;
export const cookieLimpo = "sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
