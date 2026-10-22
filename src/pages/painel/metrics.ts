import { QUESTOES } from "../../shared/questoes";
import type { Registro } from "../../shared/constantes";

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface Filtro {
  ano: number | null;
  mes: number | null; // 0-11
  gerencias: string[];
  bases: string[];
}
export const semFiltro: Filtro = { ano: null, mes: null, gerencias: [], bases: [] };

export { chaveNome } from "../../shared/texto";
import { chaveNome } from "../../shared/texto";

export const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const fmt = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export function filtrar(regs: Registro[], f: Filtro) {
  return regs.filter((r) => {
    const d = new Date(r.data);
    return (
      (f.ano == null || d.getFullYear() === f.ano) &&
      (f.mes == null || d.getMonth() === f.mes) &&
      (!f.gerencias.length || f.gerencias.includes(r.gerencia)) &&
      (!f.bases.length || f.bases.includes(r.base))
    );
  });
}

export const anosDisponiveis = (regs: Registro[]) => [...new Set(regs.map((r) => new Date(r.data).getFullYear()))].sort((a, b) => b - a);

function agrupar<T>(regs: Registro[], chave: (r: Registro) => string, resumo: (rs: Registro[], k: string) => T) {
  const m = new Map<string, Registro[]>();
  regs.forEach((r) => {
    const k = chave(r);
    m.set(k, [...(m.get(k) ?? []), r]);
  });
  return [...m].map(([k, rs]) => resumo(rs, k));
}

const chaveMes = (r: Registro) => {
  const d = new Date(r.data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const rotuloMes = (k: string) => `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`;

export const porMes = <T>(regs: Registro[], resumo: (rs: Registro[]) => T) =>
  agrupar(regs, chaveMes, (rs, k) => ({ k, nome: rotuloMes(k), ...resumo(rs) })).sort((a, b) => a.k.localeCompare(b.k));

export const porCampo = <T>(regs: Registro[], campo: "base" | "gerencia", resumo: (rs: Registro[]) => T) =>
  agrupar(regs, (r) => r[campo] || "—", (rs, k) => ({ nome: k, ...resumo(rs) }));

/** Colaboradores com mais de uma participação (identificados pelo nome). */
export function participacoes(regs: Registro[]) {
  return agrupar(regs, (r) => chaveNome(r.nome), (rs) => {
    const ult = [...rs].sort((a, b) => b.data.localeCompare(a.data))[0]!;
    return { nome: ult.nome, qtd: rs.length, base: ult.base, gerencia: ult.gerencia };
  }).sort((a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome));
}

export function resumoAvaliacao(regs: Registro[]) {
  const aprovados = regs.filter((r) => r.aprovado).length;
  return { avaliados: regs.length, aprovados, reprovados: regs.length - aprovados, media: media(regs.map((r) => r.nota)) };
}

export function mediaPorPessoa(regs: Registro[]) {
  return agrupar(regs, (r) => chaveNome(r.nome), (rs) => ({ nome: rs[0]!.nome, media: media(rs.map((r) => r.nota)), tentativas: rs.length })).sort(
    (a, b) => b.media - a.media || a.nome.localeCompare(b.nome),
  );
}

export interface ErroQuestao {
  id: number;
  enunciado: string;
  erros: number;
  taxa: number;
  quem: { nome: string; base: string; gerencia: string; marcou: string; data: string }[];
}

export function rankingQuestoes(regs: Registro[]): ErroQuestao[] {
  return QUESTOES.map((q, i) => {
    const quem = regs
      .filter((r) => !r.acertos[i])
      .map((r) => ({ nome: r.nome, base: r.base, gerencia: r.gerencia, marcou: r.respostas[i] ?? "—", data: r.data }));
    return { id: q.id, enunciado: q.enunciado, erros: quem.length, taxa: regs.length ? quem.length / regs.length : 0, quem };
  }).sort((a, b) => b.erros - a.erros || a.id - b.id);
}

export function rankingColaboradores(regs: Registro[]) {
  return agrupar(regs, (r) => chaveNome(r.nome), (rs) => {
    const questoes = new Set<number>();
    let erros = 0;
    rs.forEach((r) =>
      r.acertos.forEach((ok, i) => {
        if (!ok) {
          erros++;
          questoes.add(i + 1);
        }
      }),
    );
    return { nome: rs[0]!.nome, base: rs[0]!.base, gerencia: rs[0]!.gerencia, erros, questoes: [...questoes].sort((a, b) => a - b), tentativas: rs.length };
  })
    .filter((c) => c.erros > 0)
    .sort((a, b) => b.erros - a.erros || a.nome.localeCompare(b.nome));
}
