import { chaveNome } from "../src/shared/texto";
import { sql } from "./db";
import { registros } from "./registros";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Mapa de calor: quem participou da Escola de Segurança cruzado com as notificações (tabela `notificacoes`, do sistema
 * Notificações, no mesmo banco). O cruzamento é pelo nome (sem acento e sem diferença de maiúsculas); a lista
 * `eletricistas` de cada notificação traz os colaboradores notificados.
 */
export async function rotasMapa(req: Request, rota: string): Promise<Response | null> {
  if (rota !== "/api/admin/mapa-calor" || req.method !== "GET") return null;

  const participantes = new Map<
    string,
    { nome: string; base: string; gerencia: string; coordenador: string; situacao: string; ultima: string; participacoes: string[]; notificacoes: { data: string; base: string; gerencia: string; status: string }[] }
  >();
  for (const r of await registros()) {
    const k = chaveNome(r.nome);
    const p = participantes.get(k) ?? { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, situacao: r.situacao, ultima: "", participacoes: [], notificacoes: [] };
    p.participacoes.push(r.data);
    // base, gerência e situação da participação mais recente
    if (!p.ultima || Date.parse(r.data) >= Date.parse(p.ultima)) Object.assign(p, { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, situacao: r.situacao, ultima: r.data });
    participantes.set(k, p);
  }

  let fonte: { notificacoes: number; de: string | null; ate: string | null; disponivel: boolean } = { notificacoes: 0, de: null, ate: null, disponivel: true };
  try {
    const notif = (await sql`SELECT data::text AS data, base, gerencia, status, eletricistas FROM notificacoes WHERE data IS NOT NULL`) as {
      data: string;
      base: string | null;
      gerencia: string | null;
      status: string | null;
      eletricistas: string[] | null;
    }[];
    let de: string | null = null;
    let ate: string | null = null;
    for (const n of notif) {
      if (!de || n.data < de) de = n.data;
      if (!ate || n.data > ate) ate = n.data;
      // cada pessoa conta uma vez por notificação, mesmo que o nome se repita na lista
      for (const k of new Set((n.eletricistas ?? []).map((e) => chaveNome(String(e))))) {
        participantes.get(k)?.notificacoes.push({ data: n.data, base: n.base ?? "", gerencia: n.gerencia ?? "", status: n.status ?? "" });
      }
    }
    fonte = { notificacoes: notif.length, de, ate, disponivel: true };
  } catch (e: any) {
    // 42P01: a tabela de notificações não existe neste banco (ex.: ambiente de teste)
    if (e?.code !== "42P01") throw e;
    fonte = { notificacoes: 0, de: null, ate: null, disponivel: false };
  }

  const lista = [...participantes.values()]
    .map(({ ultima: _, ...p }) => ({ ...p, participacoes: p.participacoes.sort(), notificacoes: p.notificacoes.sort((a, b) => a.data.localeCompare(b.data)) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  return json({ participantes: lista, fonte });
}
