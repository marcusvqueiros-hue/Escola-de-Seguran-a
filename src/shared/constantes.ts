export const DURACAO_SEG = 20 * 60;
export const TOLERANCIA_FOTO_SEG = 10 * 60;
export const NOTA_MINIMA = 7;
/** Aprovação com 70% de acertos (7 de 10); acompanha o número de questões ativas. */
export const notaMinima = (total: number) => Math.ceil(total * 0.7);
/** Ids das questões da prova original (antes de o banco de questões ser editável). */
export const QUESTOES_ORIGINAIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const HORAS_POR_PARTICIPACAO = 3;

export const BASES = ["BCB", "BDC", "ITM", "PDS", "PDT", "STI"] as const;
export const GERENCIAS = ["GERE", "GOMAN", "GSTC", "ADM", "ALMOXARIFE", "FROTA", "SESMT", "PERDAS", "QSMS", "SPOT"] as const;
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
  questoes: number[]; // ids das questões que o colaborador recebeu, na ordem das respostas
  respostas: (Resposta | null)[];
  acertos: boolean[];
  nota: number;
  aprovado: boolean;
  horas: number;
  coordenador: string;
  temFoto: boolean;
  local: string | null;
}

/** Quem está logado no painel. */
export interface Eu {
  nome: string;
  usuario: string;
  admin: boolean;
}

/** Questão como o administrador a vê (com a resposta correta). */
export interface QuestaoAdmin {
  id: number;
  ordem: number;
  enunciado: string;
  opcoes: string[];
  correta: Resposta;
  ativa: boolean;
  usos: number; // avaliações finalizadas que a receberam
}

/** Resumo da questão para o Detalhamento. */
export interface QuestaoResumo {
  id: number;
  numero: number; // posição atual na lista
  enunciado: string;
  ativa: boolean;
}
