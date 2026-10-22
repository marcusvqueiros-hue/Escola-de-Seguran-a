import type { Questao, Resposta } from "./constantes";

const o = (...t: string[]) => t.map((texto, i) => ({ letra: "ABCD"[i] as Resposta, texto }));

export const QUESTOES: Questao[] = [
  {
    id: 1,
    enunciado: "Marque a alternativa que corresponde a abertura do sistema em chave fusível na estrutura tipo T?",
    opcoes: o(
      "Primeiro a mais distante da chave do meio, segundo a chave do meio, terceiro a mais próxima da estrutura.",
      "Primeira a mais próxima da chave do meio, segundo a mais distante da chave do meio, terceiro a chave do meio.",
      "Primeiro a mais distante da estrutura, segundo a mais próxima da chave do meio, e terceiro a mais próxima da chave do meio.",
      "Terceiro a mais próxima da estrutura, segundo a mais distante da chave do meio e primeira a mais distante da estrutura.",
    ),
  },
  {
    id: 2,
    enunciado: "Qual a sequência correta para abertura do sistema em chave fusível na estrutura tipo beco?",
    opcoes: o(
      "Primeiro a mais próxima da estrutura, segundo a mais distante do meio da estrutura, e terceiro a mais distante da estrutura.",
      "Primeiro a mais distante da estrutura, segundo a mais próxima do meio da estrutura, e terceiro a mais distante do meio da estrutura.",
      "Primeiro a do meio da estrutura, segundo a mais distante da estrutura, terceiro a mais próxima da estrutura.",
      "Mais distante da estrutura do meio, a mais próxima da estrutura e a mais distante.",
    ),
  },
  {
    id: 3,
    enunciado: "Qual o papel do Guardião da Vida?",
    opcoes: o(
      "Atuar de forma efetiva no gerenciamento dos desvios comportamentais de forma a corrigir, disciplinar e orientar os membros da equipe e/ou parceiro de trabalho quando constatar tal.",
      "Todas as atividades de risco acentuado deverão ter a presença do Guardião da Vida situação.",
      "Somente supervisionar a atividade.",
      "Ficar no Tablet preenchendo formulário e dar baixa de serviço.",
    ),
  },
  {
    id: 4,
    enunciado: "Descreva o significado APR – ANÁLISE PRELIMINAR DE RISCO",
    opcoes: o(
      "Avaliação da atividade percebendo os riscos existentes.",
      "Identificação, análise, avaliação e controle dos riscos existentes.",
      "Marcação dos riscos existentes e controle.",
      "Conferir apenas o local de trabalho.",
    ),
  },
  {
    id: 5,
    enunciado: "Descreva o passo a passo para o Trabalho em Altura",
    opcoes: o(
      "Montagem do KIT, amarração do solo, cinto de segurança, talabarte, linha de vida e trava queda.",
      "Amarrar escada centro e topo, linha de vida, cinto de segurança e trava queda.",
      "Utilizar cinto de segurança, talabarte, linha de vida e amarração da escada.",
      "Posicionar somente a escada para escalada.",
    ),
  },
  {
    id: 6,
    enunciado: "Desligamento programado para realizar substituição de uma estrutura. Quantos aterramentos temporários são necessários nesta atividade.",
    opcoes: o("2", "3", "1", "4"),
  },
  {
    id: 7,
    enunciado: "Desligamento programado para realizar substituição de uma estrutura. Quantos aterramentos temporários são necessários nesta atividade.",
    opcoes: o("4", "3", "2", "1"),
  },
  {
    id: 8,
    enunciado: "Durante uma atividade em rede energizada, qual EPI é indispensável para proteção contra arco elétrico e contato acidental?",
    opcoes: o(
      "Óculos de sol.",
      "Capacete sem jugular.",
      "Protetor facial e mangas isolantes adequadas à atividade.",
      "Luvas de vaqueta apenas.",
    ),
  },
  {
    id: 9,
    enunciado: "Qual é a principal finalidade do aterramento temporário em uma atividade de manutenção em rede elétrica?",
    opcoes: o(
      "Melhorar a comunicação entre os membros da equipe.",
      "Proteger os trabalhadores contra energização acidental e tensões induzidas.",
      "Facilitar o transporte de ferramentas.",
      "Delimitar a área de trabalho.",
    ),
  },
  {
    id: 10,
    enunciado: "Ao identificar uma condição insegura durante a execução de uma atividade, qual deve ser a atitude correta do colaborador?",
    opcoes: o(
      "Continuar a atividade para não atrasar o serviço.",
      "Corrigir a situação somente após finalizar a tarefa.",
      "Interromper a atividade, comunicar a equipe e adotar as medidas de controle necessárias.",
      "Registrar a condição insegura apenas ao final do expediente.",
    ),
  },
];
