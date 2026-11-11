import { chaveNome, type Filtro } from "./metrics";

/** Dimensões que um clique num gráfico pode filtrar. */
export type Dim = "mes" | "base" | "gerencia" | "coordenador" | "pessoa";

export interface LinhaGrafico {
  nome: string;
  k?: string; // "AAAA-MM" nas séries mensais
}

/** O que cada gráfico recebe: se há seleção, se uma linha está selecionada e o que fazer ao clicar. */
export interface Interacao {
  ha: boolean;
  ativo: (l: LinhaGrafico) => boolean;
  clicar: (l: LinhaGrafico) => void;
}

const SEM_COORD = "SEM COORD.";
const valorCoord = (nome: string) => (nome === SEM_COORD ? "" : nome);

/** O filtro sem a própria dimensão: o gráfico continua mostrando todas as categorias, só com as demais restrições. */
export function semDim(f: Filtro, d: Dim): Filtro {
  switch (d) {
    case "mes":
      return { ...f, ano: null, mes: null };
    case "base":
      return { ...f, bases: [] };
    case "gerencia":
      return { ...f, gerencias: [] };
    case "coordenador":
      return { ...f, coordenadores: [] };
    case "pessoa":
      return { ...f, pessoas: [] };
  }
}

const alterna = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
const anoMes = (k?: string) => (k ? { ano: Number(k.slice(0, 4)), mes: Number(k.slice(5)) - 1 } : null);

export function interacao(f: Filtro, setFiltro: (f: Filtro) => void, d: Dim): Interacao {
  switch (d) {
    case "mes":
      return {
        ha: f.ano != null || f.mes != null,
        ativo: (l) => {
          const m = anoMes(l.k);
          return !!m && (f.ano == null || m.ano === f.ano) && (f.mes == null || m.mes === f.mes);
        },
        clicar: (l) => {
          const m = anoMes(l.k);
          if (!m) return;
          const igual = f.ano === m.ano && f.mes === m.mes;
          setFiltro({ ...f, ano: igual ? null : m.ano, mes: igual ? null : m.mes });
        },
      };
    case "base":
      return { ha: f.bases.length > 0, ativo: (l) => f.bases.includes(l.nome), clicar: (l) => setFiltro({ ...f, bases: alterna(f.bases, l.nome) }) };
    case "gerencia":
      return { ha: f.gerencias.length > 0, ativo: (l) => f.gerencias.includes(l.nome), clicar: (l) => setFiltro({ ...f, gerencias: alterna(f.gerencias, l.nome) }) };
    case "coordenador":
      return {
        ha: f.coordenadores.length > 0,
        ativo: (l) => f.coordenadores.includes(valorCoord(l.nome)),
        clicar: (l) => setFiltro({ ...f, coordenadores: alterna(f.coordenadores, valorCoord(l.nome)) }),
      };
    case "pessoa":
      return {
        ha: f.pessoas.length > 0,
        ativo: (l) => f.pessoas.includes(chaveNome(l.nome)),
        clicar: (l) => setFiltro({ ...f, pessoas: alterna(f.pessoas, chaveNome(l.nome)) }),
      };
  }
}
