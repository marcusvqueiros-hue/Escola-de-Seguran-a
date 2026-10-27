import { useMemo, useState } from "react";
import type { Registro } from "../../shared/constantes";
import { NOTA_MINIMA } from "../../shared/constantes";
import { Cartao, COR, Colunas, ColunasDuplas, Linhas, ListaBarras, Rosca, Vazio } from "./charts";
import { fmt, mediaPorPessoa, media, participacoes, porCampo, porMes, rankingColaboradores, rankingQuestoes, resumoAvaliacao, chaveNome } from "./metrics";

const ordemBase = (a: { nome: string; valor: number }, b: { nome: string; valor: number }) => b.valor - a.valor || a.nome.localeCompare(b.nome);

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string | number; cor: string }) {
  return (
    <div className="kpi" style={{ ["--cor" as string]: cor }}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

export function PaginaEscola({ regs }: { regs: Registro[] }) {
  const horas = regs.reduce((a, r) => a + r.horas, 0);
  const meses = porMes(regs, (rs) => ({ valor: rs.length, horas: rs.reduce((a, r) => a + r.horas, 0) }));
  const bases = porCampo(regs, "base", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const gerencias = porCampo(regs, "gerencia", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const pessoas = useMemo(() => participacoes(regs), [regs]);
  const reinc = pessoas.filter((p) => p.qtd > 1);
  const coordenadores = porCampo(regs, "coordenador", (rs) => ({ valor: rs.length })).sort(ordemBase);
  const reincPor = (campo: "base" | "gerencia" | "coordenador") =>
    Object.entries(reinc.reduce<Record<string, number>>((a, p) => ((a[p[campo]] = (a[p[campo]] ?? 0) + 1), a), {}))
      .map(([nome, valor]) => ({ nome, valor }))
      .sort(ordemBase);

  return (
    <div className="grade-painel">
      <div className="kpis">
        <Kpi rotulo="Participantes" valor={regs.length} cor={COR.vinho} />
        <Kpi rotulo="Horas treinadas" valor={horas} cor={COR.vinho} />
        <Kpi rotulo="Colaboradores" valor={pessoas.length} cor={COR.verde} />
        <Kpi rotulo="Reincidentes" valor={reinc.length} cor={COR.vermelho} />
      </div>
      <Cartao titulo="Participantes por Mês"><Colunas dados={meses} /></Cartao>
      <Cartao titulo="Participantes por Base"><Colunas dados={bases} /></Cartao>
      <Cartao titulo="Participantes por Gerência"><Colunas dados={gerencias} /></Cartao>
      <Cartao titulo="Participação na Escola de Segurança" className="alta">
        <ListaBarras itens={pessoas.map((p) => ({ nome: p.nome, valor: p.qtd }))} max={Math.max(...pessoas.map((p) => p.qtd), 1)} destaque={(v) => (v > 1 ? COR.vermelho : COR.verde)} />
      </Cartao>
      <Cartao titulo="Horas por Mês"><Linhas dados={meses} chave="horas" /></Cartao>
      <Cartao titulo="Reincidência por Base"><Rosca dados={reincPor("base")} /></Cartao>
      <Cartao titulo="Reincidência por Gerência"><Rosca dados={reincPor("gerencia")} /></Cartao>
      <Cartao titulo="Participantes por Coordenador" className="larga"><Colunas dados={coordenadores} /></Cartao>
      <Cartao titulo="Reincidência por Coordenador"><Rosca dados={reincPor("coordenador")} /></Cartao>
    </div>
  );
}

export function PaginaAvaliacao({ regs }: { regs: Registro[] }) {
  const r = resumoAvaliacao(regs);
  const split = (rs: Registro[]) => ({ aprovados: rs.filter((x) => x.aprovado).length, reprovados: rs.filter((x) => !x.aprovado).length });
  const meses = porMes(regs, split);
  const bases = porCampo(regs, "base", split).sort((a, b) => b.aprovados + b.reprovados - (a.aprovados + a.reprovados));
  const gerencias = porCampo(regs, "gerencia", split).sort((a, b) => b.aprovados + b.reprovados - (a.aprovados + a.reprovados));
  const mediaBase = porCampo(regs, "base", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const mediaGer = porCampo(regs, "gerencia", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const coords = porCampo(regs, "coordenador", split).sort((a, b) => b.aprovados + b.reprovados - (a.aprovados + a.reprovados));
  const mediaCoord = porCampo(regs, "coordenador", (rs) => ({ valor: media(rs.map((x) => x.nota)) })).sort(ordemBase);
  const reprovPorGer = gerencias.filter((g) => g.reprovados > 0).map((g) => ({ nome: g.nome, valor: g.reprovados }));
  const pessoas = mediaPorPessoa(regs);

  return (
    <div className="grade-painel">
      <div className="kpis">
        <Kpi rotulo="Avaliados" valor={r.avaliados} cor="#0f2fa0" />
        <Kpi rotulo="Aprovados" valor={r.aprovados} cor={COR.verde} />
        <Kpi rotulo="Reprovados" valor={r.reprovados} cor={COR.vermelho} />
        <Kpi rotulo="Média de Notas" valor={fmt(r.media)} cor={COR.cinza} />
      </div>
      <Cartao titulo="Avaliação por Mês"><ColunasDuplas dados={meses} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Base"><ColunasDuplas dados={bases} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Gerência"><ColunasDuplas dados={gerencias} /></Cartao>
      <Cartao titulo="Média de Avaliação" className="alta">
        <ListaBarras itens={pessoas.map((p) => ({ nome: p.nome, valor: p.media }))} max={10} formato={(n) => fmt(n)} destaque={(v) => (v >= NOTA_MINIMA ? COR.verde : COR.vermelho)} />
      </Cartao>
      <Cartao titulo="% de Reprovados"><Rosca dados={reprovPorGer} /></Cartao>
      <Cartao titulo="Avaliação por Base"><Colunas dados={mediaBase} formato={(n) => fmt(n)} max={10} /></Cartao>
      <Cartao titulo="Avaliação por Gerência"><Colunas dados={mediaGer} formato={(n) => fmt(n)} max={10} /></Cartao>
      <Cartao titulo="Aprovados vs Reprovados por Coordenador" className="larga"><ColunasDuplas dados={coords} /></Cartao>
      <Cartao titulo="Avaliação por Coordenador"><Colunas dados={mediaCoord} formato={(n) => fmt(n)} max={10} /></Cartao>
    </div>
  );
}

const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function PaginaDetalhamento({ regs }: { regs: Registro[] }) {
  const questoes = useMemo(() => rankingQuestoes(regs), [regs]);
  const colaboradores = useMemo(() => rankingColaboradores(regs), [regs]);
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
                <span className="txt"><small>Questão {q.id}</small>{q.enunciado}</span>
                <span className="barra-e"><i style={{ width: `${(q.erros / maxErros) * 100}%` }} /></span>
                <b>{q.erros}<small> · {Math.round(q.taxa * 100)}%</small></b>
              </button>
            </li>
          ))}
        </ol>
      </Cartao>

      <Cartao titulo={atual ? `Quem errou a questão ${atual.id}` : "Quem errou"} alto="auto" className="rank-n">
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
