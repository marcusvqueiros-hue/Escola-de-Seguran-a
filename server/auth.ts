import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

const SESSAO_S = 12 * 60 * 60;

function config() {
  const usuario = process.env.ADMIN_USER;
  const senha = process.env.ADMIN_PASS;
  if (!usuario || !senha) throw new Error("ADMIN_USER e ADMIN_PASS precisam estar configuradas.");
  return { usuario, senha, segredo: process.env.SESSION_SECRET ?? `escola:${senha}` };
}

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const assinar = (exp: string, segredo: string) => createHmac("sha256", segredo).update(exp).digest("hex");

export async function tentarLogin(ip: string, usuario: string, senha: string): Promise<{ token?: string; erro?: string }> {
  const c = config();
  const agora = Date.now();
  const [f] = (await sql`SELECT n, ate FROM escola_falhas_login WHERE ip = ${ip}`) as { n: number; ate: string }[];
  const ativa = f && Number(f.ate) > agora;
  if (ativa && f!.n >= 5) return { erro: "Muitas tentativas. Aguarde alguns minutos." };

  if (!(igual(usuario.trim(), c.usuario) && igual(senha, c.senha))) {
    const n = (ativa ? f!.n : 0) + 1;
    await sql`INSERT INTO escola_falhas_login (ip, n, ate) VALUES (${ip}, ${n}, ${agora + 5 * 60 * 1000})
              ON CONFLICT (ip) DO UPDATE SET n = ${n}, ate = ${agora + 5 * 60 * 1000}`;
    return { erro: "Usuário ou senha inválidos." };
  }
  await sql`DELETE FROM escola_falhas_login WHERE ip = ${ip}`;
  const exp = String(Math.floor(agora / 1000) + SESSAO_S);
  return { token: `${exp}.${assinar(exp, c.segredo)}` };
}

export function autenticado(req: Request) {
  const t = /(?:^|;\s*)sessao=(\d+\.[a-f0-9]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!t) return false;
  const [exp, mac] = t.split(".") as [string, string];
  return Number(exp) > Date.now() / 1000 && igual(mac, assinar(exp, config().segredo));
}

const seguro = (req: Request) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

export const cookieSessao = (token: string, req: Request) =>
  `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSAO_S}${seguro(req) ? "; Secure" : ""}`;
export const cookieLimpo = "sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
