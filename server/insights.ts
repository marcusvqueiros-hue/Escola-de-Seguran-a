import { chaveNome } from "../src/shared/texto";
import { sql } from "./db";
import { listarQuestoes } from "./questoes";
import { registros } from "./registros";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

// ---------- temas: o mesmo critério classifica as não conformidades e as questões da avaliação ----------
const TEMAS: { nome: string; treinavel: boolean; re: RegExp }[] = [
  { nome: "Comunicação", treinavel: false, re: /comunicac/ },
  { nome: "Veículos, transporte e içamento", treinavel: true, re: /transport|acondicion|guincho|guindauto|munck|veiculo|carga\b|pneu|motociclista|freio|icament|cruzeta/ },
  { nome: "Escadas e trabalho em altura", treinavel: true, re: /escada|altura|linha de vida|talabarte|cinto|spiq|trava ?quedas?|queda|antiqueda|daqc/ },
  { nome: "Sinalização e isolamento da área", treinavel: true, re: /sinaliz|isolad|isolamento|\bcone|delimit|bandeirol/ },
  { nome: "APR e procedimentos", treinavel: true, re: /\bapr\b|procedimento|permiss|analise preliminar|ordem de servico|check ?list|condicao insegura|emissao da os|seccionament|controle do coi|cumprir normas|instrucoes|improvis|coordenac/ },
  { nome: "Ferramentas e equipamentos", treinavel: true, re: /ferrament|vara de manobra|bastao|nr-?10|detector|motosserra|maquina/ },
  { nome: "Operação e manobras de rede", treinavel: true, re: /chave fusivel|abertura|desligament|religament|rede energizada|energizad|aterramento|manobra|estrutura/ },
  { nome: "Crachá e documentação", treinavel: false, re: /cracha|qr code|document|identificac|credenc/ },
  { nome: "Atenção e comportamento", treinavel: true, re: /desatent|comportament|atencao|guardiao|desvio|pressa|habilidade/ },
  { nome: "Instalações e alojamento", treinavel: false, re: /alojament|arejad|higiene|lazer|banheiro|vestiario|refeitor|limpeza|conservac|agua potavel|chuveiro|papel higienico|lavatorio|glp|piso|iluminac|alimentac|sabonete|devassamento/ },
  { nome: "EPI e EPC", treinavel: true, re: /\bepi\b|\bepc\b|protetor|vestiment|calcad|luva|manga|capacete|bota|oculos|ensaio|danificad|perneira|balaclava|lencol isolante|cobertura|macacao|barra de seguranca/ },
];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function temaDe(texto: string) {
  const t = semAcento(texto);
  return TEMAS.find((x) => x.re.test(t)) ?? { nome: "Outros", treinavel: false };
}

const dia = (iso: string) => {
  // horário de Brasília, para o mês/dia da participação não depender do fuso do servidor
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const taxa = (n: number, pessoasDia: number) => (pessoasDia > 0 ? Math.round(((n / pessoasDia) * 3000) * 10) / 10 : 0); // por 100 pessoas-mês
const mais = <T,>(m: Map<T, number>) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];

type Acao = { prioridade: "alta" | "media" | "info"; tipo: "alerta" | "oportunidade" | "positivo"; titulo: string; evidencia: string; acao: string; itens?: string[] };

export async function rotasInsights(req: Request, rota: string): Promise<Response | null> {
  if (rota !== "/api/admin/insights" || req.method !== "GET") return null;

  const regs = await registros();
  const questoes = (await listarQuestoes()).filter((q) => q.ativa);
  const cadastro = (await sql`SELECT nome_norm, base, gerencia, situacao FROM escola_colaboradores`) as { nome_norm: string; base: string | null; gerencia: string | null; situacao: string | null }[];
  const efetivo = cadastro.filter((c) => (c.situacao ?? "ATIVO") !== "DESLIGADO");
  const cad = new Map(cadastro.map((c) => [c.nome_norm, c]));

  // ---------- notificações ----------
  type Notif = { data: string; base: string; gerencia: string; nc: string; tratado: boolean; dias: number | null; status: string; pessoas: string[] };
  let notif: Notif[] = [];
  let disponivel = true;
  try {
    notif = ((await sql`SELECT data::text AS data, base, gerencia, nao_conformidade, tratado, dias, status, eletricistas FROM notificacoes WHERE data IS NOT NULL`) as any[]).map((n) => ({
      data: n.data,
      base: n.base ?? "",
      gerencia: n.gerencia ?? "",
      nc: String(n.nao_conformidade ?? "").trim(),
      tratado: !!n.tratado,
      dias: n.dias == null ? null : Number(n.dias),
      status: String(n.status ?? ""),
      pessoas: [...new Set(((n.eletricistas ?? []) as string[]).map((e) => chaveNome(String(e))))],
    }));
  } catch (e: any) {
    if (e?.code !== "42P01") throw e;
    disponivel = false;
  }
  const dMin = notif.reduce((a, n) => (n.data < a ? n.data : a), "9999-12-31");
  const dMax = notif.reduce((a, n) => (n.data > a ? n.data : a), "0000-01-01");

  // ---------- pessoas ----------
  const nomeDe = new Map<string, string>();
  const escola = new Map<string, { nome: string; base: string; gerencia: string; dias: string[]; ultimaAprovada: boolean; ultimoDia: string }>();
  for (const r of [...regs].sort((a, b) => Date.parse(a.data) - Date.parse(b.data))) {
    const k = chaveNome(r.nome);
    const p = escola.get(k) ?? { nome: r.nome, base: r.base, gerencia: r.gerencia, dias: [], ultimaAprovada: r.aprovado, ultimoDia: "" };
    p.dias.push(dia(r.data));
    Object.assign(p, { nome: r.nome, base: r.base, gerencia: r.gerencia, ultimaAprovada: r.aprovado, ultimoDia: dia(r.data) });
    escola.set(k, p);
    nomeDe.set(k, r.nome);
  }
  type Pessoa = { datas: string[]; bases: Map<string, number>; ger: Map<string, number> };
  const porPessoa = new Map<string, Pessoa>();
  for (const n of notif) {
    for (const k of n.pessoas) {
      const p: Pessoa = porPessoa.get(k) ?? { datas: [], bases: new Map(), ger: new Map() };
      p.datas.push(n.data);
      if (n.base) p.bases.set(n.base, (p.bases.get(n.base) ?? 0) + 1);
      if (n.gerencia) p.ger.set(n.gerencia, (p.ger.get(n.gerencia) ?? 0) + 1);
      porPessoa.set(k, p);
    }
  }

  // ---------- efetividade ----------
  let antes = 0, depois = 0, diasAntes = 0, diasDepois = 0, reincidiram = 0, notificadosAntes = 0, reincDeNotificados = 0;
  const demorasAteEscola: number[] = [];
  const reincidentes: { nome: string; n: number; ultima: string; base: string }[] = [];
  for (const [k, p] of escola) {
    const marco = p.dias[0]!;
    const ns = porPessoa.get(k)?.datas ?? [];
    const a = ns.filter((d) => d <= marco).length;
    const d = ns.filter((x) => x > marco).length;
    if (disponivel) {
      if (dias(dMin, marco) > 0) { antes += a; diasAntes += dias(dMin, marco); }
      if (dias(marco, dMax) > 0) { depois += d; diasDepois += dias(marco, dMax); }
    }
    if (a > 0) {
      notificadosAntes++;
      if (d > 0) reincDeNotificados++;
      const primeira = ns.filter((x) => x <= marco).sort()[0]!;
      demorasAteEscola.push(dias(primeira, marco));
    }
    if (d > 0) {
      reincidiram++;
      reincidentes.push({ nome: p.nome, n: d, ultima: ns.sort().at(-1)!, base: p.base });
    }
  }
  // referência: notificados que não fizeram a Escola, contados a partir da 1ª notificação
  let ctrlN = 0, ctrlDias = 0, ctrlPessoas = 0;
  for (const [k, p] of porPessoa) {
    if (escola.has(k)) continue;
    const ds = [...p.datas].sort();
    const janela = dias(ds[0]!, dMax);
    if (janela <= 0) continue;
    ctrlPessoas++;
    ctrlDias += janela;
    ctrlN += ds.filter((d) => d > ds[0]!).length;
  }
  const taxaAntes = taxa(antes, diasAntes);
  const taxaDepois = taxa(depois, diasDepois);
  const taxaRef = taxa(ctrlN, ctrlDias);
  const variacao = taxaAntes > 0 ? Math.round(((taxaDepois - taxaAntes) / taxaAntes) * 100) : null;
  const tempoAteEscola = demorasAteEscola.length ? Math.round(demorasAteEscola.reduce((a, b) => a + b, 0) / demorasAteEscola.length) : null;

  // ---------- notificações por mês × participações por mês ----------
  const mes = (d: string) => d.slice(0, 7);
  const meses = new Map<string, { notificacoes: number; participacoes: number }>();
  for (const n of notif) meses.set(mes(n.data), { notificacoes: (meses.get(mes(n.data))?.notificacoes ?? 0) + 1, participacoes: meses.get(mes(n.data))?.participacoes ?? 0 });
  for (const r of regs) {
    const m = mes(dia(r.data));
    meses.set(m, { notificacoes: meses.get(m)?.notificacoes ?? 0, participacoes: (meses.get(m)?.participacoes ?? 0) + 1 });
  }
  const porMes = [...meses].sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => ({ mes: m, ...v }));

  // ---------- não conformidades por tema ----------
  const questoesPorTema = new Map<string, number>();
  for (const q of questoes) {
    const t = temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome;
    questoesPorTema.set(t, (questoesPorTema.get(t) ?? 0) + 1);
  }
  const contTema = new Map<string, number>();
  const contNC = new Map<string, number>();
  for (const n of notif) {
    if (!n.nc) continue;
    const t = temaDe(n.nc).nome;
    contTema.set(t, (contTema.get(t) ?? 0) + 1);
    contNC.set(n.nc, (contNC.get(n.nc) ?? 0) + 1);
  }
  const totalNC = [...contTema.values()].reduce((a, b) => a + b, 0);
  const temas = [...contTema]
    .map(([tema, n]) => ({ tema, n, pct: pct(n, totalNC), questoes: questoesPorTema.get(tema) ?? 0, treinavel: TEMAS.find((x) => x.nome === tema)?.treinavel ?? false }))
    .sort((a, b) => b.n - a.n);
  const topNCs = [...contNC].map(([texto, n]) => ({ texto, n })).sort((a, b) => b.n - a.n).slice(0, 10);

  // ---------- cobertura ----------
  const cobertura = (campo: "base" | "gerencia") => {
    const nots = new Map<string, number>();
    for (const n of notif) if (n[campo]) nots.set(n[campo], (nots.get(n[campo]) ?? 0) + 1);
    const part = new Map<string, number>();
    for (const p of escola.values()) if (p[campo]) part.set(p[campo], (part.get(p[campo]) ?? 0) + 1);
    const efet = new Map<string, number>();
    for (const c of efetivo) if (c[campo]) efet.set(c[campo]!, (efet.get(c[campo]!) ?? 0) + 1);
    const totalN = [...nots.values()].reduce((a, b) => a + b, 0);
    const totalP = [...part.values()].reduce((a, b) => a + b, 0);
    return [...new Set([...nots.keys(), ...part.keys()])]
      .map((k) => ({
        nome: k,
        notificacoes: nots.get(k) ?? 0,
        pctNotificacoes: pct(nots.get(k) ?? 0, totalN),
        participantes: part.get(k) ?? 0,
        pctParticipantes: pct(part.get(k) ?? 0, totalP),
        efetivo: efet.get(k) ?? 0,
        cobertura: pct(part.get(k) ?? 0, efet.get(k) ?? 0),
      }))
      .sort((a, b) => b.notificacoes - a.notificacoes);
  };
  const porBase = cobertura("base");
  const porGerencia = cobertura("gerencia");

  // ---------- programa ----------
  const aprovadas = regs.filter((r) => r.aprovado).length;
  const mediaNota = regs.length ? regs.reduce((a, r) => a + r.nota, 0) / regs.length : 0;
  const repetentes = [...escola.values()].filter((p) => p.dias.length > 1).length;
  const reprovadosSemNova = [...escola.values()].filter((p) => !p.ultimaAprovada);

  const erros = questoes
    .map((q, i) => {
      let aplic = 0, err = 0;
      for (const r of regs) {
        const idx = r.questoes.indexOf(q.id);
        if (idx < 0) continue;
        aplic++;
        if (!r.acertos[idx]) err++;
      }
      return { numero: i + 1, enunciado: q.enunciado, aplicadas: aplic, erros: err, taxa: pct(err, aplic), tema: temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome };
    })
    .filter((q) => q.aplicadas >= 10)
    .sort((a, b) => b.taxa - a.taxa);

  const pendentes = notif.filter((n) => !n.tratado).length;
  const diasMedios = notif.filter((n) => n.dias != null);
  const tempoResposta = diasMedios.length ? Math.round((diasMedios.reduce((a, n) => a + (n.dias ?? 0), 0) / diasMedios.length) * 10) / 10 : null;

  // ---------- quem convocar ----------
  const convocar = [...porPessoa]
    .filter(([k, p]) => !escola.has(k) && p.datas.length >= 2 && (cad.get(k)?.situacao ?? "ATIVO") !== "DESLIGADO")
    .map(([k, p]) => ({ nome: nomeDe.get(k) ?? cad.get(k)?.nome_norm ?? k, chave: k, n: p.datas.length, base: cad.get(k)?.base || mais(p.bases) || "", gerencia: cad.get(k)?.gerencia || mais(p.ger) || "" }))
    .sort((a, b) => b.n - a.n || a.chave.localeCompare(b.chave));

  // ---------- ações recomendadas ----------
  const acoes: Acao[] = [];
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  if (disponivel && convocar.length) {
    // o nome do notificado vem em caixa alta do próprio sistema de notificações
    acoes.push({
      prioridade: "alta", tipo: "alerta",
      titulo: `Convocar ${convocar.length} colaboradores notificados mais de uma vez`,
      evidencia: `${convocar.length} pessoas têm 2 ou mais notificações e ainda não participaram da Escola de Segurança. As maiores têm ${convocar[0]!.n} notificações.`,
      acao: "Incluí-los nas próximas turmas, começando pelos com mais notificações, e combinar a convocação com o coordenador de cada um.",
      itens: convocar.slice(0, 10).map((c) => `${c.nome.toUpperCase()} — ${[c.base, c.gerencia].filter(Boolean).join("/") || "sem base"} — ${c.n} notificações`),
    });
  }
  if (disponivel && reincidentes.length) {
    acoes.push({
      prioridade: "alta", tipo: "alerta",
      titulo: reincidentes.length === 1 ? "1 participante recebeu notificação depois da Escola" : `${reincidentes.length} participantes receberam notificação depois da Escola`,
      evidencia: `${pct(reincidentes.length, escola.size)}% dos participantes tiveram notificação depois de participar (${reincidentes.reduce((a, r) => a + r.n, 0)} no total).`,
      acao: "Fazer acompanhamento individual com a liderança, entender se a causa é falta de conhecimento ou de comportamento e reforçar com treinamento prático em campo.",
      itens: reincidentes.sort((a, b) => b.n - a.n).map((r) => `${r.nome.toUpperCase()} — ${r.base} — ${r.n} notificação(ões) depois da Escola`),
    });
  }
  if (disponivel) {
    for (const t of temas.filter((x) => x.treinavel && x.questoes === 0 && x.pct >= 8).slice(0, 2)) {
      acoes.push({
        prioridade: "alta", tipo: "oportunidade",
        titulo: `Tema "${t.tema}" não está na avaliação`,
        evidencia: `Responde por ${t.pct}% das notificações (${fmt(t.n)}) e não tem nenhuma questão ativa na avaliação da Escola.`,
        acao: `Incluir um módulo de conteúdo e questões sobre "${t.tema}" na aba Questões, e reaplicar para quem já participou.`,
      });
    }
    const baixos = temas.filter((x) => x.treinavel && x.questoes === 1 && x.pct >= 10).slice(0, 1);
    for (const t of baixos) {
      acoes.push({
        prioridade: "media", tipo: "oportunidade",
        titulo: `Tema "${t.tema}" tem pouca cobertura`,
        evidencia: `${t.pct}% das notificações, com apenas 1 questão na avaliação.`,
        acao: "Ampliar o número de questões e o conteúdo do tema.",
      });
    }
    // bases com carga alta e cobertura baixa
    const criticas = porBase.filter((b) => b.pctNotificacoes >= 12 && b.pctParticipantes < b.pctNotificacoes * 0.6);
    if (criticas.length) {
      acoes.push({
        prioridade: "alta", tipo: "alerta",
        titulo: `${criticas.map((b) => b.nome).join(", ")}: muitas notificações e pouca participação na Escola`,
        evidencia: criticas.map((b) => `${b.nome} tem ${b.pctNotificacoes}% das notificações e ${b.pctParticipantes}% dos participantes (${b.participantes} de ${fmt(b.efetivo)} do efetivo).`).join(" "),
        acao: "Programar turmas dedicadas nessas bases, de preferência presenciais, até a participação acompanhar a proporção de notificações.",
      });
    }
    const gerCriticas = porGerencia.filter((g) => g.pctNotificacoes >= 15 && g.pctParticipantes < g.pctNotificacoes * 0.6);
    if (gerCriticas.length) {
      acoes.push({
        prioridade: "media", tipo: "alerta",
        titulo: `Gerência ${gerCriticas.map((g) => g.nome).join(", ")} com baixa participação frente às notificações`,
        evidencia: gerCriticas.map((g) => `${g.nome}: ${g.pctNotificacoes}% das notificações e ${g.pctParticipantes}% dos participantes.`).join(" "),
        acao: "Alinhar com os coordenadores da gerência um calendário de participação.",
      });
    }
  }
  if (disponivel && questoes.length >= 4) {
    const exc = [...questoesPorTema].find(([t, q]) => q / questoes.length >= 0.4 && (temas.find((x) => x.tema === t)?.pct ?? 0) < 5);
    if (exc) {
      const [t, q] = exc;
      acoes.push({
        prioridade: "media", tipo: "oportunidade",
        titulo: "Conteúdo da avaliação concentrado em um tema com poucas notificações",
        evidencia: `${q} de ${questoes.length} questões (${pct(q, questoes.length)}%) são sobre "${t}", tema com ${temas.find((x) => x.tema === t)?.pct ?? 0}% das notificações.`,
        acao: "Redistribuir as questões entre os temas que mais geram notificações, como os listados em Não conformidades x conteúdo da Escola.",
      });
    }
  }
  if (erros.length && erros[0]!.taxa >= 30) {
    acoes.push({
      prioridade: "media", tipo: "alerta",
      titulo: "Questões com maior taxa de erro",
      evidencia: `A questão ${erros[0]!.numero} tem ${erros[0]!.taxa}% de erro (${erros[0]!.erros} de ${erros[0]!.aplicadas}).`,
      acao: "Revisar o conteúdo e a redação dessas questões e conferir o gabarito. Se muitos erram a mesma questão, o ponto pode estar mal explicado no treinamento.",
      itens: erros.slice(0, 3).map((q) => `Questão ${q.numero} (${q.tema}) — ${q.taxa}% de erro — ${q.enunciado.slice(0, 90)}${q.enunciado.length > 90 ? "…" : ""}`),
    });
  }
  if (reprovadosSemNova.length) {
    acoes.push({
      prioridade: "media", tipo: "oportunidade",
      titulo: `${reprovadosSemNova.length} colaboradores reprovados não refizeram a avaliação`,
      evidencia: `A última avaliação de ${reprovadosSemNova.length} pessoas ficou abaixo da nota mínima e não houve nova tentativa.`,
      acao: "Reforçar o conteúdo com a liderança e reaplicar a avaliação.",
      itens: reprovadosSemNova.slice(0, 10).map((p) => `${p.nome.toUpperCase()} — ${p.base}/${p.gerencia}`),
    });
  }
  if (disponivel && pendentes > 0) {
    acoes.push({
      prioridade: "media", tipo: "alerta",
      titulo: `${pendentes} notificações ainda sem tratamento`,
      evidencia: `${pct(pendentes, notif.length)}% das notificações não foram tratadas${tempoResposta != null ? `; o tempo médio de resposta registrado é de ${tempoResposta} dias` : ""}.`,
      acao: "Cobrar o tratamento com os coordenadores responsáveis, pois uma não conformidade sem tratamento tende a se repetir.",
    });
  }
  const efetivoN = efetivo.length;
  if (efetivoN && escola.size / efetivoN < 0.2) {
    acoes.push({
      prioridade: "media", tipo: "oportunidade",
      titulo: "Baixa cobertura do efetivo",
      evidencia: `${escola.size} colaboradores passaram pela Escola, o que representa ${pct(escola.size, efetivoN)}% dos ${fmt(efetivoN)} cadastrados.`,
      acao: "Definir uma meta de participação por gerência e um calendário de turmas, priorizando quem já tem notificação.",
    });
  }
  if (disponivel && notificadosAntes >= 5 && reincDeNotificados === 0) {
    acoes.push({
      prioridade: "info", tipo: "positivo",
      titulo: "Ninguém que já tinha sido notificado voltou a ser notificado depois da Escola",
      evidencia: `Dos ${notificadosAntes} participantes que tinham notificação antes de participar, nenhum recebeu nova notificação depois.`,
      acao: "Resultado favorável, mas o período de acompanhamento ainda é curto; continuar monitorando.",
    });
  }
  if (disponivel && variacao != null) {
    acoes.push({
      prioridade: "info", tipo: variacao < 0 ? "positivo" : "alerta",
      titulo: variacao < 0 ? `Queda de ${Math.abs(variacao)}% nas notificações por pessoa depois da Escola` : `As notificações por pessoa subiram ${variacao}% depois da Escola`,
      evidencia: `Participantes: ${taxaAntes} notificações por 100 pessoas-mês antes e ${taxaDepois} depois. Quem foi notificado e não participou: ${taxaRef} no mesmo critério.`,
      acao: variacao < 0 ? "O sinal é favorável; manter o ritmo de turmas e acompanhar nos próximos meses." : "Revisar conteúdo e método do treinamento e acompanhar os participantes em campo.",
    });
  }
  const ordem = { alta: 0, media: 1, info: 2 };
  acoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);

  return json({
    disponivel,
    periodo: { de: disponivel ? dMin : null, ate: disponivel ? dMax : null },
    programa: {
      participacoes: regs.length,
      participantes: escola.size,
      efetivo: efetivoN,
      cobertura: pct(escola.size, efetivoN),
      aprovacao: pct(aprovadas, regs.length),
      mediaNota: Math.round(mediaNota * 100) / 100,
      repetentes,
      reprovadosSemNova: reprovadosSemNova.length,
    },
    efetividade: {
      participantes: escola.size,
      notificadosAntes,
      reincidiram,
      taxaReincidencia: pct(reincidiram, escola.size),
      reincidenciaDosNotificados: pct(reincDeNotificados, notificadosAntes),
      taxaAntes, taxaDepois, taxaReferencia: taxaRef, variacao,
      pessoasReferencia: ctrlPessoas,
      tempoAteEscola,
      notificacoesAntes: antes,
      notificacoesDepois: depois,
    },
    notificacoes: { total: notif.length, tratadas: notif.length - pendentes, pendentes, tempoResposta, temas, topNCs },
    porMes,
    porBase,
    porGerencia,
    erros: erros.slice(0, 5),
    acoes,
  });
}
