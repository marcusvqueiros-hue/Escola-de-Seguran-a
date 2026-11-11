import { useMemo, useState } from "react";
import type { QuestaoResumo, Registro } from "../../shared/constantes";
import { NOTA_MINIMA } from "../../shared/constantes";
import { Cartao, COR, Colunas, ColunasDuplas, Linhas, ListaBarras, Rosca, Vazio } from "./charts";
import { filtrar, fmt, mediaPorPessoa, media, participacoes, porCampo, porMes, rankingColaboradores, rankingQuestoes, resumoAvaliacao, chaveNome, type Filtro } from "./metrics";
import { interacao, semDim, type Dim } from "./cruzar";

const ordemBase = (a: { nome: string; valor: number }, b: { nome: string; valor: number }) => b.valor - a.valor || a.nome.localeCompare(b.nome);

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string | number; cor: string }) {
  return (
    <div className="kpi" style={{ ["--cor" as string]: cor }}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

export function KpisEscola({ regs }: { regs: Registro[] }) {
  const pessoas = useMemo(() => participacoes(regs), [regs]);
  return (
    <div className="kpis">
      <Kpi rotulo="Participantes" valor={regs.length} cor={COR.vinho} />
      <Kpi rotulo="Horas treinadas" valor={regs.reduce((a, r) => a + r.horas, 0)} cor={COR.vinho} />
      <Kpi rotulo="Colaboradores" valor={pessoas.length} cor={COR.verde} />
      <Kpi rotulo="Reincidentes" valor={pessoas.filter((p) => p.qtd > 1).length} cor={COR.vermelho} />
    </div>
  );
}

export function KpisAvaliacao({ regs }: { regs: Registro[] }) {
  const r = resumoAvaliacao(regs);
  return (
    <div className="kpis">
      <Kpi rotulo="Avaliados" valor={r.avaliados} cor="#0f2fa0" />
      <Kpi rotulo="Aprovados" valor={r.aprovados} cor={COR.verde} />
      <Kpi rotulo="Reprovados" valor={r.reprovados} cor={COR.vermelho} />
      <Kpi rotulo="Média de Notas" valor={fmt(r.media)} cor={COR.cinza} />
    </div>
  );
}

interface PropsCruzadas {
  todos: Registro[];
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
}

/** Cada gráfico mostra todas as suas categorias (com as demais restrições) e destaca a que está selecionada. */
function useCruzado({ todos, filtro, onFiltro }: PropsCruzadas) {
  const dados = (d: Dim) => filtrar(todos, semDim(filtro, d));
  const inter = (d: Dim) => interacao(filtro, onFiltro, d);
  return { dados, inter };
}

export function PaginaEscola(props: PropsCruzadas) {
  const { dados, inter } = useCruzado(props);
  const meses = porMes(dados("mes"), (rs) => ({ valor: rs.length, horas: rs.reduce((a, r) => a + r.horas, 0) }));
  const bases = porCampo(dados("base"), "base", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const gerencias = porCampo(dados("gerencia"), "gerencia", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const pessoas = participacoes(dados("pessoa"));
  const coordenadores = porCampo(dados("coordenador"), "coordenador", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const reincPor = (campo: "base" | "gerencia" | "coordenador") =>
    Object.entries(
      participacoes(dados(campo))
        .filter((p) => p.qtd > 1)
        .reduce<Record<string, number>>((a, p) => ((a[p[campo]] = (a[p[campo]] ?? 0) + 1), a), {}),
    )
      .map(([nome, valor]) => ({ nome, valor }))
      .sort(ordemBase);
  const rBase = reincPor("base");
  const rGer = reincPor("gerencia");
  const rCoord = reincPor("coordenador");

  return (
    <div className="grade-painel">
      <Cartao titulo="Participantes por Mês" tabela={meses}><Colunas dados={meses} inter={inter("mes")} /></Cartao>
      <Cartao titulo="Participantes por Base" tabela={bases}><Colunas dados={bases} inter={inter("base")} /></Cartao>
      <Cartao titulo="Participantes por Gerência" tabela={gerencias}><Colunas dados={gerencias} inter={inter("gerencia")} /></Cartao>
      <Cartao titulo="Participação na Escola de Segurança" tabela={pessoas.map((x) => ({ nome: x.nome, valor: x.qtd }))} className="alta">
        <ListaBarras itens={pessoas.map((p) => ({ nome: p.nome, valor: p.qtd }))} max={Math.max(...pessoas.map((p) => p.qtd), 1)} destaque={(v) => (v > 1 ? COR.serie : COR.neutro)} inter={inter("pessoa")} />
      </Cartao>
      <Cartao titulo="Horas por Mês" tabela={meses}><Linhas dados={meses} chave="horas" inter={inter("mes")} /></Cartao>
      <Cartao titulo="Reincidência por Base" tabela={rBase}><Rosca dados={rBase} inter={inter("base")} /></Cartao>
      <Cartao titulo="Reincidência por Gerência" tabela={rGer}><Rosca dados={rGer} inter={inter("gerencia")} /></Cartao>
      <Cartao titulo="Participantes por Coordenador" tabela={coordenadores} className="larga"><Colunas dados={coordenadores} inter={inter("coordenador")} /></Cartao>
      <Cartao titulo="Reincidência por Coordenador" tabela={rCoord}><Rosca dados={rCoord} inter={inter("coordenador")} /></Cartao>
    </div>
  );
}

export function PaginaAvaliacao(props: PropsCruzadas) {
  const { dados, inter } = useCruzado(props);
  const split = (rs: Registro[]) => ({ aprovados: rs.filter((x) => x.aprovado).length, reprovados: rs.filter((x) => !x.aprovado).length });
  const total = (x: { aprovados: number; reprovados: number }) => x.aprovados + x.reprovados;
  const meses = porMes(dados("mes"), split);
  const bases = porCampo(dados("base"), "base", split).sort((a, b) => total(b) - total(a));
  const gerencias = porCampo(dados("gerencia"), "gerencia", split).sort((a, b) => total(b) - total(a));
  const mediaBase = porCampo(dados("base"), "base", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const mediaGer = porCampo(dados("gerencia"), "gerencia", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const coords = porCampo(dados("coordenador"), "coordenador", split).sort((a, b) => total(b) - total(a));
  const mediaCoord = porCampo(dados("coordenador"), "coordenador", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const reprovPorGer = gerencias.filter((g) => g.reprovados > 0).map((g) => ({ nome: g.nome, valor: g.reprovados }));
  const pessoas = mediaPorPessoa(dados("pessoa"));

  return (
    <div className="grade-painel">
      <Cartao titulo="Avaliação por Mês" tabela={meses}><ColunasDuplas dados={meses} inter={inter("mes")} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Base" tabela={bases}><ColunasDuplas dados={bases} inter={inter("base")} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Gerência" tabela={gerencias}><ColunasDuplas dados={gerencias} inter={inter("gerencia")} /></Cartao>
      <Cartao titulo="Média de Avaliação" tabela={pessoas.map((x) => ({ nome: x.nome, valor: x.media }))} className="alta">
        <ListaBarras itens={pessoas.map((p) => ({ nome: p.nome, valor: p.media }))} max={10} formato={(n) => fmt(n)} destaque={(v) => (v >= NOTA_MINIMA ? COR.verde : COR.vermelho)} inter={inter("pessoa")} />
      </Cartao>
      <Cartao titulo="% de Reprovados" tabela={reprovPorGer}><Rosca dados={reprovPorGer} inter={inter("gerencia")} /></Cartao>
      <Cartao titulo="Avaliação por Base" tabela={mediaBase}><Colunas dados={mediaBase} formato={(n) => fmt(n)} max={10} inter={inter("base")} /></Cartao>
      <Cartao titulo="Avaliação por Gerência" tabela={mediaGer}><Colunas dados={mediaGer} formato={(n) => fmt(n)} max={10} inter={inter("gerencia")} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Coordenador" tabela={coords} className="larga"><ColunasDuplas dados={coords} inter={inter("coordenador")} /></Cartao>
      <Cartao titulo="Avaliação por Coordenador" tabela={mediaCoord}><Colunas dados={mediaCoord} formato={(n) => fmt(n)} max={10} inter={inter("coordenador")} /></Cartao>
    </div>
  );
}

const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function PaginaDetalhamento({ regs, questoesLista }: { regs: Registro[]; questoesLista: QuestaoResumo[] }) {
  const questoes = useMemo(() => rankingQuestoes(regs, questoesLista), [regs, questoesLista]);
  const colaboradores = useMemo(() => rankingColaboradores(regs, questoesLista), [regs, questoesLista]);
  const [sel, setSel] = useState<number | null>(null);
  const atual = questoes.find((q) => q.id === sel) ?? questoes.find((q) => q.erros > 0) ?? questoes[0];
  const maxErros = Math.max(...questoes.map((q) => q.erros), 1);
  const comFoto = useMemo(() => regs.filter((r) => r.temFoto).slice(-12).reverse(), [regs]);

  if (!regs.length) return <Vazio />;

  return (
    <div className="grade-detalhe">
      <Cartao titulo="Ranking das questões mais erradas" alto="auto" className="rank-q">
        <ol className="rank">
          {questoes.map((q, i) => (
            <li key={q.id} className={q.id === atual?.id ? "sel" : ""}>
              <button onClick={() => setSel(q.id)}>
                <span className="pos">{i + 1}º</span>
                <span className="txt"><small>Questão {q.numero}</small>{q.enunciado}</span>
                <span className="barra-e"><i style={{ width: `${(q.erros / maxErros) * 100}%` }} /></span>
                <b>{q.erros}<small> · {Math.round(q.taxa * 100)}%</small></b>
              </button>
            </li>
          ))}
        </ol>
      </Cartao>

      <Cartao titulo={atual ? `Quem errou a questão ${atual.numero}` : "Quem errou"} alto="auto" className="rank-n">
        {atual && atual.quem.length ? (
          <>
            <p className="enunciado-sel">{atual.enunciado}</p>
            <ul className="quem">
              {atual.quem.map((p, i) => (
                <li key={p.nome + i}>
                  <b>{p.nome}</b>
                  <span>{p.base} · {p.gerencia} · {dataBr(p.data)}</span>
                  <em title="Alternativa marcada">{p.marcou}</em>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Vazio />
        )}
      </Cartao>

      <Cartao titulo="Ranking de colaboradores por erros" alto="auto" className="rank-c">
        <ol className="rank compacto">
          {colaboradores.map((c, i) => (
            <li key={chaveNome(c.nome)}>
              <div>
                <span className="pos">{i + 1}º</span>
                <span className="txt"><b>{c.nome}</b><small>{c.base} · {c.gerencia} · {c.coordenador || "SEM COORD."}{c.tentativas > 1 ? ` · ${c.tentativas} avaliações` : ""}</small></span>
                <b className="erros">{c.erros}<small> erro{c.erros > 1 ? "s" : ""}</small></b>
              </div>
              <div className="tags">{c.questoes.map((q) => <i key={q}>Q{q}</i>)}</div>
            </li>
          ))}
        </ol>
      </Cartao>

      {comFoto.length > 0 && (
        <Cartao titulo="Últimas fotos registradas" alto="auto" className="fotos-card">
          <div className="fotos">
            {comFoto.map((r) => (
              <a key={r.id} href={`/api/admin/foto/${r.id}`} target="_blank" rel="noreferrer" title={`${r.nome}\n${r.local ?? ""}`}>
                <img src={`/api/admin/foto/${r.id}`} alt={`Foto de ${r.nome}`} loading="lazy" />
                <span>{r.nome.split(" ").slice(0, 2).join(" ")}</span>
              </a>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}
