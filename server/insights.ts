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

  // Filtros: base e coordenador recortam tudo; o mês recorta os indicadores descritivos (a efetividade, o funil e as listas de
  // convocação comparam períodos e por isso usam o histórico inteiro do recorte de base/coordenador).
  const parametros = new URL(req.url).searchParams;
  const fBase = (parametros.get("base") ?? "").trim().toUpperCase();
  const fMes = /^\d{4}-\d{2}$/.test(parametros.get("mes") ?? "") ? parametros.get("mes")! : "";
  const primeiroNome = (n: string) => {
    const k = chaveNome(n).split(" ")[0] ?? "";
    return k === "SEM" ? "" : k;
  };
  const fCoord = primeiroNome(parametros.get("coordenador") ?? "");

  const todasRegs = await registros();
  const regsEscopo = todasRegs.filter((x) => (!fBase || x.base === fBase) && (!fCoord || primeiroNome(x.coordenador) === fCoord));
  const regs = fMes ? regsEscopo.filter((x) => dia(x.data).startsWith(fMes)) : regsEscopo;
  const questoes = (await listarQuestoes()).filter((q) => q.ativa);
  const cadastro = (await sql`SELECT nome_norm, base, gerencia, situacao, gerente FROM escola_colaboradores`) as { nome_norm: string; base: string | null; gerencia: string | null; situacao: string | null; gerente: string | null }[];
  const efetivo = cadastro.filter((c) => (c.situacao ?? "ATIVO") !== "DESLIGADO" && (!fBase || c.base === fBase) && (!fCoord || primeiroNome(c.gerente ?? "") === fCoord));
  const cad = new Map(cadastro.map((c) => [c.nome_norm, c]));

  // ---------- notificações ----------
  type Notif = { data: string; base: string; gerencia: string; nc: string; tratado: boolean; dias: number | null; status: string; coord: string; processo: string; pessoas: string[] };
  let notifTodas: Notif[] = [];
  let disponivel = true;
  try {
    notifTodas = ((await sql`SELECT data::text AS data, base, gerencia, nao_conformidade, tratado, dias, status, coordenador, processo, eletricistas FROM notificacoes WHERE data IS NOT NULL`) as any[]).map((n) => ({
      data: n.data,
      base: n.base ?? "",
      gerencia: n.gerencia ?? "",
      nc: String(n.nao_conformidade ?? "").trim(),
      tratado: !!n.tratado,
      dias: n.dias == null ? null : Number(n.dias),
      status: String(n.status ?? ""),
      coord: String(n.coordenador ?? "").trim(),
      processo: String(n.processo ?? "").trim().toUpperCase(),
      pessoas: [...new Set(((n.eletricistas ?? []) as string[]).map((e) => chaveNome(String(e))))],
    }));
  } catch (e: any) {
    if (e?.code !== "42P01") throw e;
    disponivel = false;
  }
  const notifEscopo = notifTodas.filter((n) => (!fBase || n.base === fBase) && (!fCoord || primeiroNome(n.coord) === fCoord));
  const notif = fMes ? notifEscopo.filter((n) => n.data.startsWith(fMes)) : notifEscopo;
  const dMin = notifEscopo.reduce((a, n) => (n.data < a ? n.data : a), "9999-12-31");
  const dMax = notifEscopo.reduce((a, n) => (n.data > a ? n.data : a), "0000-01-01");

  // ---------- pessoas ----------
  type Participante = { nome: string; base: string; gerencia: string; coordenador: string; dias: string[]; ultimaAprovada: boolean; ultimoDia: string };
  const agruparEscola = (lista: typeof regs) => {
    const m = new Map<string, Participante>();
    for (const x of [...lista].sort((a, b) => Date.parse(a.data) - Date.parse(b.data))) {
      const k = chaveNome(x.nome);
      const p = m.get(k) ?? { nome: x.nome, base: x.base, gerencia: x.gerencia, coordenador: x.coordenador, dias: [], ultimaAprovada: x.aprovado, ultimoDia: "" };
      p.dias.push(dia(x.data));
      Object.assign(p, { nome: x.nome, base: x.base, gerencia: x.gerencia, coordenador: x.coordenador, ultimaAprovada: x.aprovado, ultimoDia: dia(x.data) });
      m.set(k, p);
    }
    return m;
  };
  const nomeDe = new Map<string, string>(regsEscopo.map((x) => [chaveNome(x.nome), x.nome]));
  const escola = agruparEscola(regsEscopo); // histórico do recorte
  const escolaMes = fMes ? agruparEscola(regs) : escola; // só quem participou no mês escolhido
  type Pessoa = { datas: string[]; bases: Map<string, number>; ger: Map<string, number> };
  const porPessoa = new Map<string, Pessoa>();
  for (const n of notifEscopo) {
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
  const reincidentes: { nome: string; n: number; ultima: string; base: string; coord: string }[] = [];
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
      reincidentes.push({ nome: p.nome, n: d, ultima: ns.sort().at(-1)!, base: p.base, coord: p.coordenador });
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
  for (const n of notifEscopo) meses.set(mes(n.data), { notificacoes: (meses.get(mes(n.data))?.notificacoes ?? 0) + 1, participacoes: meses.get(mes(n.data))?.participacoes ?? 0 });
  for (const r of regsEscopo) {
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
    for (const p of escolaMes.values()) if (p[campo]) part.set(p[campo], (part.get(p[campo]) ?? 0) + 1);
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
  const repetentes = [...escolaMes.values()].filter((p) => p.dias.length > 1).length;
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

  // ---------- visão de especialista: funil, concentração, tendência, coordenadores, qualidade e ritmo ----------
  const deslocar = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const chaveCoord = primeiroNome;

  // funil: da população até o resultado
  const prioritarios = [...porPessoa].filter(([, p]) => p.datas.length >= 2);
  const notificadosQueParticiparam = [...porPessoa.keys()].filter((k) => escola.has(k)).length;
  const prioritariosQueParticiparam = prioritarios.filter(([k]) => escola.has(k)).length;
  const aprovadosPessoas = [...escola.values()].filter((p) => p.ultimaAprovada).length;
  const funil = {
    etapas: [
      { etapa: "Efetivo cadastrado", valor: efetivo.length },
      ...(disponivel ? [{ etapa: "Notificados ao menos 1 vez", valor: porPessoa.size }] : []),
      { etapa: "Participaram da Escola", valor: escola.size },
      { etapa: "Aprovados na última avaliação", valor: aprovadosPessoas },
      ...(disponivel ? [{ etapa: "Sem notificação depois da Escola", valor: escola.size - reincidiram }] : []),
    ],
    notificados: porPessoa.size,
    coberturaNotificados: pct(notificadosQueParticiparam, porPessoa.size),
    prioritarios: prioritarios.length,
    coberturaPrioritarios: pct(prioritariosQueParticiparam, prioritarios.length),
  };

  // concentração: poucas pessoas respondem por boa parte das notificações?
  const contagens = [...porPessoa.values()].map((p) => p.datas.length).sort((a, b) => b - a);
  const totalMencoes = contagens.reduce((a, b) => a + b, 0);
  const faixaDe = (n: number) => (n >= 4 ? "4 ou mais" : String(n));
  const faixas = ["1", "2", "3", "4 ou mais"].map((f) => {
    const doGrupo = contagens.filter((c) => faixaDe(c) === f);
    const m = doGrupo.reduce((a, b) => a + b, 0);
    return { faixa: f === "1" ? "1 notificação" : f === "4 ou mais" ? "4 ou mais" : `${f} notificações`, pessoas: doGrupo.length, mencoes: m, pctPessoas: pct(doGrupo.length, contagens.length), pctMencoes: pct(m, totalMencoes) };
  });
  const topPessoas = Math.max(1, Math.ceil(contagens.length * 0.1));
  const concentracao = {
    faixas,
    totalPessoas: contagens.length,
    totalMencoes,
    top10Pessoas: topPessoas,
    top10PctMencoes: pct(contagens.slice(0, topPessoas).reduce((a, b) => a + b, 0), totalMencoes),
  };

  // tempo entre a primeira notificação e a participação
  const demoras = [
    { faixa: "Até 30 dias", n: demorasAteEscola.filter((d) => d <= 30).length },
    { faixa: "31 a 90 dias", n: demorasAteEscola.filter((d) => d > 30 && d <= 90).length },
    { faixa: "91 a 180 dias", n: demorasAteEscola.filter((d) => d > 90 && d <= 180).length },
    { faixa: "Mais de 180 dias", n: demorasAteEscola.filter((d) => d > 180).length },
  ];

  // tendência: últimos 90 dias contra os 90 anteriores, por tema
  const d90 = deslocar(dMax, -90);
  const d180 = deslocar(dMax, -180);
  const tRec = new Map<string, number>();
  const tAnt = new Map<string, number>();
  for (const n of notifEscopo) {
    if (!n.nc) continue;
    const t = temaDe(n.nc).nome;
    if (n.data > d90) tRec.set(t, (tRec.get(t) ?? 0) + 1);
    else if (n.data > d180) tAnt.set(t, (tAnt.get(t) ?? 0) + 1);
  }
  const tendenciaTemas = [...new Set([...tRec.keys(), ...tAnt.keys()])]
    .map((tema) => {
      const rec = tRec.get(tema) ?? 0;
      const ant = tAnt.get(tema) ?? 0;
      return { tema, anterior: ant, recente: rec, variacao: ant >= 5 ? Math.round(((rec - ant) / ant) * 100) : null, treinavel: TEMAS.find((x) => x.nome === tema)?.treinavel ?? false };
    })
    .filter((t) => t.anterior + t.recente >= 8)
    .sort((a, b) => b.recente - a.recente)
    .slice(0, 8);

  // onde cada problema acontece: tema x base
  const temasTop = temas.filter((t) => t.tema !== "Outros").slice(0, 7).map((t) => t.tema);
  const basesOrdem = porBase.map((b) => b.nome);
  const baseTema = {
    bases: basesOrdem,
    temas: temasTop,
    valores: temasTop.map((tema) => basesOrdem.map((b) => notif.filter((n) => n.base === b && n.nc && temaDe(n.nc).nome === tema).length)),
  };

  // coordenadores (o cruzamento é pelo primeiro nome, pois a grafia difere entre os sistemas)
  const cNot = new Map<string, { nomes: Map<string, number>; n: number; pend: number }>();
  for (const n of notif) {
    const k = chaveCoord(n.coord);
    if (!k) continue;
    const c = cNot.get(k) ?? { nomes: new Map(), n: 0, pend: 0 };
    c.n++;
    if (!n.tratado) c.pend++;
    c.nomes.set(n.coord.toUpperCase(), (c.nomes.get(n.coord.toUpperCase()) ?? 0) + 1);
    cNot.set(k, c);
  }
  const cPart = new Map<string, number>();
  for (const p of escolaMes.values()) { const k = chaveCoord(p.coordenador); if (k) cPart.set(k, (cPart.get(k) ?? 0) + 1); }
  const cEfet = new Map<string, number>();
  for (const c of efetivo) { const k = chaveCoord(c.gerente ?? ""); if (k) cEfet.set(k, (cEfet.get(k) ?? 0) + 1); }
  const cReinc = new Map<string, number>();
  for (const r of reincidentes) { const k = chaveCoord(r.coord); if (k) cReinc.set(k, (cReinc.get(k) ?? 0) + 1); }
  const coordenadores = [...new Set([...cNot.keys(), ...cPart.keys()])]
    .map((k) => {
      const c = cNot.get(k);
      return {
        nome: c ? (mais(c.nomes) ?? k) : k,
        notificacoes: c?.n ?? 0,
        pctNotificacoes: pct(c?.n ?? 0, notif.length),
        pendentes: c?.pend ?? 0,
        tratadasPct: c?.n ? pct(c.n - c.pend, c.n) : 0,
        participantes: cPart.get(k) ?? 0,
        efetivo: cEfet.get(k) ?? 0,
        cobertura: pct(cPart.get(k) ?? 0, cEfet.get(k) ?? 0),
        reincidentes: cReinc.get(k) ?? 0,
      };
    })
    .filter((c) => c.notificacoes > 0 || c.participantes > 0)
    .sort((a, b) => b.notificacoes - a.notificacoes);

  // processos
  const pr = new Map<string, { n: number; pend: number }>();
  for (const n of notif) { if (!n.processo) continue; const v = pr.get(n.processo) ?? { n: 0, pend: 0 }; v.n++; if (!n.tratado) v.pend++; pr.set(n.processo, v); }
  const processos = [...pr].map(([nome, v]) => ({ nome, n: v.n, pct: pct(v.n, notif.length), pendentes: v.pend })).sort((a, b) => b.n - a.n).slice(0, 8);

  // qualidade da avaliação: dificuldade de cada questão e textos repetidos
  const palavras = (t: string) => new Set(semAcento(t).split(/\W+/).filter((w) => w.length > 3));
  const jaccard = (a: Set<string>, b: Set<string>) => {
    const inter = [...a].filter((x) => b.has(x)).length;
    return a.size + b.size ? inter / (a.size + b.size - inter) : 0;
  };
  const textos = questoes.map((q) => palavras(`${q.enunciado} ${q.opcoes.join(" ")}`));
  const qualidadeQuestoes = questoes.map((q, i) => {
    let aplic = 0, err = 0;
    for (const r of regs) {
      const idx = r.questoes.indexOf(q.id);
      if (idx < 0) continue;
      aplic++;
      if (!r.acertos[idx]) err++;
    }
    const taxaErro = pct(err, aplic);
    const nivel = aplic < 10 ? "Poucos dados" : taxaErro >= 60 ? "Muito difícil" : taxaErro >= 30 ? "Difícil" : taxaErro >= 10 ? "Adequada" : "Muito fácil";
    const igual = textos.findIndex((t, j) => j < i && jaccard(t, textos[i]!) >= 0.85);
    return { numero: i + 1, enunciado: q.enunciado, tema: temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome, aplicadas: aplic, taxaErro, nivel, repeteDe: igual >= 0 ? igual + 1 : null };
  });
  const ab = new Map<string, { n: number; ok: number; soma: number }>();
  for (const r of regs) { if (!r.base) continue; const v = ab.get(r.base) ?? { n: 0, ok: 0, soma: 0 }; v.n++; if (r.aprovado) v.ok++; v.soma += r.nota; ab.set(r.base, v); }
  const aprovacaoPorBase = [...ab].map(([nome, v]) => ({ nome, participacoes: v.n, aprovacao: pct(v.ok, v.n), media: Math.round((v.soma / v.n) * 100) / 100 })).sort((a, b) => b.participacoes - a.participacoes);

  // ritmo: quantas pessoas novas por mês e quanto falta para atender quem tem 2+ notificações
  const novos90 = [...escola.values()].filter((p) => p.dias[0]! > deslocar(hoje, -90)).length;
  const ritmoMes = Math.round((novos90 / 3) * 10) / 10;
  const faltam = convocar.length;
  const ritmo = {
    novosPorMes: ritmoMes,
    prioritariosPendentes: faltam,
    mesesNoRitmoAtual: ritmoMes > 0 && faltam > 0 ? Math.ceil(faltam / ritmoMes) : null,
    necessarioPorMes3Meses: Math.ceil(faltam / 3),
  };

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
  // ---------- ações da visão de especialista ----------
  if (disponivel && faltam > 0 && ritmo.mesesNoRitmoAtual != null && ritmo.mesesNoRitmoAtual > 6) {
    acoes.push({
      prioridade: "alta", tipo: "alerta",
      titulo: `No ritmo atual, atender quem tem 2 ou mais notificações levaria ${ritmo.mesesNoRitmoAtual} meses`,
      evidencia: `Entram cerca de ${fmt(ritmoMes)} participantes novos por mês e há ${fmt(faltam)} pessoas com 2 ou mais notificações aguardando. Para atendê-las em 3 meses seria preciso cerca de ${fmt(ritmo.necessarioPorMes3Meses)} por mês.`,
      acao: "Aumentar a frequência e o tamanho das turmas (turmas semanais, em cada base) e começar por quem tem mais notificações; considerar uma versão presencial curta para o campo.",
    });
  }
  if (disponivel && concentracao.top10PctMencoes >= 25) {
    acoes.push({
      prioridade: "media", tipo: "oportunidade",
      titulo: `10% das pessoas concentram ${concentracao.top10PctMencoes}% das notificações`,
      evidencia: `${fmt(concentracao.top10Pessoas)} colaboradores, entre ${fmt(concentracao.totalPessoas)} notificados, aparecem em ${concentracao.top10PctMencoes}% das menções. Quem tem 4 ou mais notificações soma ${faixas[3]!.pessoas} pessoas.`,
      acao: "Tratar esse grupo com um plano individual (acompanhamento do coordenador e treinamento prático), em vez de apenas a turma geral. É onde o ganho por pessoa é maior.",
    });
  }
  for (const t of tendenciaTemas.filter((x) => x.treinavel && x.variacao != null && x.variacao >= 40 && x.recente >= 8).slice(0, 2)) {
    acoes.push({
      prioridade: "media", tipo: "alerta",
      titulo: `"${t.tema}" está crescendo nas notificações`,
      evidencia: `${t.recente} notificações nos últimos 90 dias contra ${t.anterior} nos 90 anteriores (+${t.variacao}%).`,
      acao: "Antecipar uma ação de reforço sobre o tema nas bases mais afetadas, antes que vire o principal problema do próximo trimestre.",
    });
  }
  if (disponivel && notif.length) {
    const medCob = pct(escola.size, efetivo.length);
    const fracos = coordenadores.filter((c) => c.pctNotificacoes >= 15 && c.cobertura < medCob * 0.6);
    if (fracos.length) {
      acoes.push({
        prioridade: "media", tipo: "alerta",
        titulo: `Coordenação ${fracos.map((c) => c.nome).join(", ")} com muitas notificações e baixa participação`,
        evidencia: fracos.map((c) => `${c.nome}: ${c.pctNotificacoes}% das notificações, ${c.participantes} participante(s) para ${fmt(c.efetivo)} do efetivo (${c.cobertura}%).`).join(" "),
        acao: "Alinhar com o coordenador uma meta de participação e um calendário de turmas para a equipe.",
      });
    }
    const comPendencia = coordenadores.filter((c) => c.pendentes >= 5);
    if (comPendencia.length) {
      acoes.push({
        prioridade: "media", tipo: "alerta",
        titulo: "Notificações sem tratamento concentradas em poucos coordenadores",
        evidencia: `${comPendencia.reduce((a, c) => a + c.pendentes, 0)} das ${pendentes} pendências estão com ${comPendencia.length} coordenador(es).`,
        acao: "Cobrar o tratamento dessas notificações na reunião de acompanhamento.",
        itens: comPendencia.map((c) => `${c.nome} — ${c.pendentes} pendentes de ${c.notificacoes} (${c.tratadasPct}% tratadas)`),
      });
    }
  }
  const repetidas = qualidadeQuestoes.filter((q) => q.repeteDe != null);
  if (repetidas.length) {
    acoes.push({
      prioridade: "media", tipo: "alerta",
      titulo: "Questões praticamente repetidas na avaliação",
      evidencia: repetidas.map((q) => `A questão ${q.numero} tem texto quase igual ao da questão ${q.repeteDe}`).join("; ") + ".",
      acao: "Conferir se a repetição é intencional. Se não for, reescrever ou desativar uma delas na aba Questões, pois pesa duas vezes na nota sem medir um conhecimento novo.",
    });
  }
  const faceis = qualidadeQuestoes.filter((q) => q.nivel === "Muito fácil");
  if (faceis.length) {
    acoes.push({
      prioridade: "info", tipo: "oportunidade",
      titulo: `${faceis.length} questão(ões) muito fácil(eis)`,
      evidencia: `Menos de 10% de erro em ${faceis.map((q) => `Q${q.numero}`).join(", ")}: quase todos acertam.`,
      acao: "Usar essas posições para temas ainda não cobertos (como EPI), com perguntas que realmente separem quem sabe de quem não sabe.",
    });
  }
  const fracasBase = aprovacaoPorBase.filter((b) => b.participacoes >= 8 && b.aprovacao < 70);
  if (fracasBase.length) {
    acoes.push({
      prioridade: "media", tipo: "alerta",
      titulo: `Aprovação baixa em ${fracasBase.map((b) => b.nome).join(", ")}`,
      evidencia: fracasBase.map((b) => `${b.nome}: ${b.aprovacao}% de aprovação em ${b.participacoes} participações.`).join(" "),
      acao: "Verificar se o conteúdo chega bem nessas bases (instrutor, horário, material) e reforçar antes de reaplicar.",
    });
  }
  if (disponivel && tempoAteEscola != null && tempoAteEscola > 90) {
    acoes.push({
      prioridade: "media", tipo: "oportunidade",
      titulo: `A Escola chega, em média, ${tempoAteEscola} dias depois da primeira notificação`,
      evidencia: `Entre os participantes que já tinham notificação, a demora média foi de ${tempoAteEscola} dias.`,
      acao: "Definir um prazo (por exemplo, 30 dias após a segunda notificação) para encaminhar à Escola, de forma que o treinamento acompanhe o desvio.",
    });
  }

  // ---------- resumo executivo: o essencial em poucas frases ----------
  const resumo: { tipo: "alerta" | "oportunidade" | "positivo" | "neutro"; texto: string }[] = [];
  resumo.push({ tipo: "neutro", texto: `${fmt(escolaMes.size)} colaboradores participaram da Escola${fMes ? " no mês" : ""} (${pct(escolaMes.size, efetivoN)}% do efetivo cadastrado), com aprovação de ${pct(aprovadas, regs.length)}% nas participações.` });
  if (disponivel) {
    resumo.push({
      tipo: funil.coberturaNotificados < 25 ? "alerta" : "neutro",
      texto: `Entre as ${fmt(funil.notificados)} pessoas notificadas no período, ${funil.coberturaNotificados}% já passaram pela Escola; entre as ${fmt(funil.prioritarios)} com 2 ou mais notificações, ${funil.coberturaPrioritarios}%.`,
    });
    if (variacao != null) {
      const pouca = escola.size < 10 ? " Com poucos participantes neste recorte, leia como pista e não como conclusão." : "";
      resumo.push({
        tipo: variacao < 0 ? "positivo" : "alerta",
        texto: variacao < 0
          ? `Quem participou teve ${Math.abs(variacao)}% menos notificações por pessoa-mês depois da Escola (${taxaAntes} para ${taxaDepois}), sinal favorável que ainda precisa de mais tempo de acompanhamento.${pouca}`
          : `As notificações por pessoa-mês dos participantes subiram ${variacao}% depois da Escola (${taxaAntes} para ${taxaDepois}).${pouca}`,
      });
    }
    const lacuna = temas.find((t) => t.treinavel && t.questoes === 0 && t.pct >= 8);
    if (lacuna) resumo.push({ tipo: "oportunidade", texto: `A maior lacuna de conteúdo é "${lacuna.tema}": ${lacuna.pct}% das notificações e nenhuma questão na avaliação.` });
    if (concentracao.top10PctMencoes >= 25) resumo.push({ tipo: "oportunidade", texto: `Uma minoria concentra o problema: 10% dos notificados respondem por ${concentracao.top10PctMencoes}% das notificações.` });
    if (ritmo.mesesNoRitmoAtual != null && ritmo.mesesNoRitmoAtual > 6) resumo.push({ tipo: "alerta", texto: `No ritmo atual (${fmt(ritmoMes)} participantes novos por mês), atender quem tem 2 ou mais notificações levaria ${ritmo.mesesNoRitmoAtual} meses.` });
  }

  const ordem = { alta: 0, media: 1, info: 2 };
  acoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);

  // opções dos filtros: sempre a lista completa, para os menus não encolherem ao filtrar
  const nomesCoord = new Map<string, Map<string, number>>();
  const marcar = (nome: string) => {
    const k = primeiroNome(nome);
    if (!k) return;
    const m = nomesCoord.get(k) ?? new Map<string, number>();
    m.set(nome.toUpperCase(), (m.get(nome.toUpperCase()) ?? 0) + 1);
    nomesCoord.set(k, m);
  };
  for (const n of notifTodas) marcar(n.coord);
  for (const x of todasRegs) marcar(x.coordenador);
  const opcoes = {
    bases: [...new Set([...todasRegs.map((x) => x.base), ...notifTodas.map((n) => n.base)])].filter(Boolean).sort(),
    meses: [...new Set([...todasRegs.map((x) => dia(x.data).slice(0, 7)), ...notifTodas.map((n) => n.data.slice(0, 7))])].sort(),
    coordenadores: [...nomesCoord].map(([chave, m]) => ({ chave, nome: mais(m) ?? chave })).sort((a, b) => a.nome.localeCompare(b.nome)),
  };

  return json({
    filtros: { base: fBase, mes: fMes, coordenador: fCoord },
    opcoes,
    disponivel,
    periodo: { de: disponivel ? dMin : null, ate: disponivel ? dMax : null },
    programa: {
      participacoes: regs.length,
      participantes: escolaMes.size,
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
    funil,
    concentracao,
    demoras,
    tendenciaTemas,
    baseTema,
    coordenadores,
    processos,
    qualidade: { questoes: qualidadeQuestoes, aprovacaoPorBase },
    ritmo,
    resumo,
    acoes,
  });
}
