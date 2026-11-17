import { sql } from "./db";
import { GABARITO } from "./gabarito";
import { HORAS_POR_PARTICIPACAO, notaMinima, QUESTOES_ORIGINAIS, type Registro, type Resposta } from "../src/shared/constantes";
import { chaveNome } from "../src/shared/texto";
import { gerenteDe } from "../src/shared/coordenadores";

export async function registros(): Promise<Registro[]> {
  const linhas = (await sql`SELECT * FROM escola_tentativas WHERE finalizada_em IS NOT NULL ORDER BY finalizada_em`) as any[];
  // coordenador: o do cadastro (pelo nome); sem cadastro, o da regra de gerência e base
  const cadastro = new Map(
    ((await sql`SELECT nome_norm, gerente, situacao FROM escola_colaboradores`) as { nome_norm: string; gerente: string | null; situacao: string | null }[]).map((c) => [c.nome_norm, { gerente: c.gerente ?? "", situacao: c.situacao || "ATIVO" }]),
  );
  return linhas.map((l) => {
    const respostas = JSON.parse(l.respostas ?? "[]") as (Resposta | null)[];
    const questoes: number[] = l.questoes ? JSON.parse(l.questoes) : QUESTOES_ORIGINAIS;
    const acertos: boolean[] = l.acertos ? JSON.parse(l.acertos) : GABARITO.map((g, i) => respostas[i] === g);
    const pontos = acertos.filter(Boolean).length;
    const total = acertos.length || 1;
    return {
      id: l.id,
      data: l.finalizada_em,
      nome: l.nome,
      matricula: l.matricula,
      prefixo: l.prefixo,
      funcao: l.funcao,
      base: l.base,
      gerencia: l.gerencia,
      questoes,
      respostas,
      acertos,
      // nota de 0 a 10, qualquer que seja o número de questões da época
      nota: total === 10 ? pontos : Math.round((pontos / total) * 1000) / 100,
      aprovado: pontos >= notaMinima(total),
      horas: HORAS_POR_PARTICIPACAO,
      coordenador: cadastro.get(chaveNome(l.nome))?.gerente || gerenteDe(l.gerencia, l.base),
      situacao: cadastro.get(chaveNome(l.nome))?.situacao ?? "SEM CADASTRO",
      temFoto: l.tem_foto,
      local: l.local,
    };
  });
}
