export const DURACAO_SEG = 20 * 60;
export const TOLERANCIA_FOTO_SEG = 10 * 60;
export const NOTA_MINIMA = 7;
export const HORAS_POR_PARTICIPACAO = 3;

export const BASES = ["BCB", "BDC", "ITM", "PDS", "PDT", "STI"] as const;
export const GERENCIAS = ["GERE", "GOMAN", "GSTC", "PERDAS", "QSMS", "SPOT"] as const;
export const FUNCOES = [
  "ELETRICISTA",
  "ELETRICISTA MONTADOR",
  "ENCARREGADO LINHA VIVA DE DISTRIBUIÇÃO",
  "MOTORISTA OP DE GUINCHO",
  "MOTORISTA",
  "ENCARREGADO",
  "SUPERVISOR",
  "TÉCNICO DE SEGURANÇA",
];

export type Resposta = "A" | "B" | "C" | "D";

export interface Questao {
  id: number;
  enunciado: string;
  opcoes: { letra: Resposta; texto: string }[];
}

export interface Identificacao {
  nome: string;
  matricula: string;
  prefixo: string;
  funcao: string;
  base: string;
  gerencia: string;
}

/** Registro finalizado, como o painel recebe (sem foto e sem gabarito). */
export interface Registro extends Identificacao {
  id: string;
  data: string;
  respostas: (Resposta | null)[];
  acertos: boolean[];
  nota: number;
  aprovado: boolean;
  horas: number;
  temFoto: boolean;
  local: string | null;
}
