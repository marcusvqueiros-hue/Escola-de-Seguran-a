import type { Resposta } from "../src/shared/constantes";

// Nunca é enviado ao navegador: a correção acontece só no servidor.
export const GABARITO: Resposta[] = ["B", "C", "A", "B", "A", "B", "A", "C", "B", "C"];

export function corrigir(respostas: (Resposta | null)[]) {
  const acertos = GABARITO.map((g, i) => respostas[i] === g);
  return { acertos, nota: acertos.filter(Boolean).length };
}
