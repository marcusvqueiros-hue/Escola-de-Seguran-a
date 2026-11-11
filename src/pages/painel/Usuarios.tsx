import { useCallback, useEffect, useMemo, useState } from "react";
import { BASES, GERENCIAS, type Eu } from "../../shared/constantes";
import { Janela } from "./Configuracao";

interface Usuario {
  id: number;
  usuario: string;
  nome: string;
  chapa: string;
  funcao: string;
  base: string;
  gerencia: string;
  processo: string;
  admin: boolean;
  ativo: boolean;
  desenvolvedor: boolean;
}

interface Formulario {
  id?: number;
  usuario: string;
  nome: string;
  chapa: string;
  funcao: string;
  base: string;
  gerencia: string;
  admin: boolean;
  ativo: boolean;
  senha: string;
}

const VAZIO: Formulario = { usuario: "@", nome: "", chapa: "", funcao: "", base: "", gerencia: "", admin: false, ativo: true, senha: "" };

async function chamar(url: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? "Falha na requisição.");
  return d;
}

export default function Usuarios({ eu }: { eu: Eu }) {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [fPerfil, setFPerfil] = useState("");
  const [fSituacao, setFSituacao] = useState("");
  const [modal, setModal] = useState<{ tipo: "form"; dados: Formulario } | { tipo: "excluir"; u: Usuario } | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista((await chamar("/api/admin/usuarios")).usuarios);
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  const proprio = (u: Usuario) => u.usuario.toLowerCase() === eu.usuario.toLowerCase();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter(
      (u) =>
        (!q || `${u.nome} ${u.usuario} ${u.chapa}`.toLowerCase().includes(q)) &&
        (!fPerfil || (fPerfil === "admin" ? u.admin : !u.admin)) &&
        (!fSituacao || (fSituacao === "ativo" ? u.ativo : !u.ativo)),
    );
  }, [lista, busca, fPerfil, fSituacao]);

  const admins = lista.filter((u) => u.admin).length;
  const inativos = lista.filter((u) => !u.ativo).length;

  async function salvar(f: Formulario) {
    const corpo = { usuario: f.usuario, nome: f.nome, chapa: f.chapa, funcao: f.funcao, base: f.base, gerencia: f.gerencia, admin: f.admin, ativo: f.ativo, ...(f.senha ? { senha: f.senha } : {}) };
    if (f.id) await chamar(`/api/admin/usuarios/${f.id}`, "PUT", corpo);
    else await chamar("/api/admin/usuarios", "POST", corpo);
    setAviso(f.id ? "Usuário atualizado." : "Usuário adicionado.");
    setModal(null);
    await carregar();
  }

  async function alternarAtivo(u: Usuario) {
    try {
      await chamar(`/api/admin/usuarios/${u.id}`, "PUT", { ativo: !u.ativo });
      setAviso(u.ativo ? `Acesso de ${u.nome} desativado.` : `Acesso de ${u.nome} reativado.`);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function excluir(u: Usuario) {
    await chamar(`/api/admin/usuarios/${u.id}`, "DELETE");
    setAviso(`Acesso de ${u.nome} excluído.`);
    setModal(null);
    await carregar();
  }

  return (
    <div className="usuarios">
      <div className="kpis">
        <div className="kpi" style={{ ["--cor" as string]: "var(--serie)" }}><span>Usuários</span><strong>{lista.length}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--good)" }}><span>Administradores</span><strong>{admins}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--info)" }}><span>Somente relatórios</span><strong>{lista.length - admins}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--neutro)" }}><span>Desativados</span><strong>{inativos}</strong></div>
      </div>

      <section className="card tabela-card">
        <div className="barra-acoes">
          <input className="busca" type="search" placeholder="Buscar por nome, usuário ou chapa" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={fPerfil} onChange={(e) => setFPerfil(e.target.value)} aria-label="Perfil">
            <option value="">Todos os perfis</option>
            <option value="admin">Administradores</option>
            <option value="leitor">Somente relatórios</option>
          </select>
          <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value)} aria-label="Situação">
            <option value="">Toda situação</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Desativados</option>
          </select>
          {(busca || fPerfil || fSituacao) && <button className="limpar" onClick={() => { setBusca(""); setFPerfil(""); setFSituacao(""); }}>Limpar</button>}
        </div>

        <div className="barra-acoes acoes-topo">
          <span className="contador">{filtrados.length === lista.length ? lista.length : `${filtrados.length} de ${lista.length}`} usuário(s)</span>
          <span className="espaco" />
          <button className="btn-mini" onClick={() => setModal({ tipo: "form", dados: { ...VAZIO } })}>＋ Novo usuário</button>
        </div>

        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        {erro && <p className="erro-msg">{erro}</p>}

        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>Usuário</th><th>Chapa</th><th>Função</th><th>Base</th><th>Gerência</th><th>Perfil</th><th>Situação</th><th aria-label="Ações" /></tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className={u.ativo ? "" : "linha-inativa"}>
                  <td data-rotulo="Nome" className="nome">{u.nome}{proprio(u) && <small className="voce"> (você)</small>}</td>
                  <td data-rotulo="Usuário">{u.usuario}</td>
                  <td data-rotulo="Chapa">{u.chapa}</td>
                  <td data-rotulo="Função">{u.funcao}</td>
                  <td data-rotulo="Base">{u.base}</td>
                  <td data-rotulo="Gerência">{u.gerencia}</td>
                  <td data-rotulo="Perfil">
                    <span className={`selo-sit ${u.admin ? "ok" : ""}`}>{u.desenvolvedor ? "Desenvolvedor" : u.admin ? "Administrador" : "Relatórios"}</span>
                  </td>
                  <td data-rotulo="Situação"><span className={`selo-sit ${u.ativo ? "ok" : ""}`}>{u.ativo ? "Ativo" : "Desativado"}</span></td>
                  <td className="acoes-linha">
                    <button title="Editar" aria-label={`Editar ${u.nome}`} onClick={() => setModal({ tipo: "form", dados: { id: u.id, usuario: u.usuario, nome: u.nome, chapa: u.chapa, funcao: u.funcao, base: u.base, gerencia: u.gerencia, admin: u.admin, ativo: u.ativo, senha: "" } })}>✎</button>
                    <button title={u.ativo ? "Desativar acesso" : "Reativar acesso"} aria-label={`${u.ativo ? "Desativar" : "Reativar"} ${u.nome}`} disabled={proprio(u) || u.desenvolvedor} onClick={() => alternarAtivo(u)}>{u.ativo ? "⏸" : "▶"}</button>
                    <button title="Excluir acesso" aria-label={`Excluir ${u.nome}`} className="perigo" disabled={proprio(u) || u.desenvolvedor} onClick={() => setModal({ tipo: "excluir", u })}>🗑</button>
                  </td>
                </tr>
              ))}
              {!filtrados.length && <tr><td colSpan={9} className="vazio-tab">{carregando ? "Carregando…" : "Nenhum usuário encontrado."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.tipo === "form" && <FormUsuario inicial={modal.dados} eu={eu} onSalvar={salvar} onFechar={() => setModal(null)} />}

      {modal?.tipo === "excluir" && (
        <Janela titulo="Excluir acesso" onFechar={() => setModal(null)}>
          <p>Excluir o acesso de <b>{modal.u.nome}</b> ({modal.u.usuario})? Essa pessoa deixa de entrar no painel na hora. Para só suspender, use Desativar.</p>
          <Confirmar acao={() => excluir(modal.u)} rotulo="Excluir" onFechar={() => setModal(null)} />
        </Janela>
      )}
    </div>
  );
}

function Confirmar({ acao, rotulo, onFechar }: { acao: () => Promise<void>; rotulo: string; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  return (
    <>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="acoes">
        <button className="btn sec" onClick={onFechar}>Cancelar</button>
        <button
          className="btn perigo"
          disabled={indo}
          onClick={async () => {
            setIndo(true);
            try {
              await acao();
            } catch (e) {
              setErro((e as Error).message);
              setIndo(false);
            }
          }}
        >
          {indo ? "Aguarde…" : rotulo}
        </button>
      </div>
    </>
  );
}

function FormUsuario({ inicial, eu, onSalvar, onFechar }: { inicial: Formulario; eu: Eu; onSalvar: (f: Formulario) => Promise<void>; onFechar: () => void }) {
  const [f, setF] = useState<Formulario>(inicial);
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<Formulario>) => setF((x) => ({ ...x, ...p }));

  const novo = !inicial.id;
  const euMesmo = !novo && inicial.usuario.toLowerCase() === eu.usuario.toLowerCase();
  const ok = f.nome.trim().split(/\s+/).length >= 2 && f.usuario.replace("@", "").length >= 3 && (!novo || f.senha.length >= 4) && (!f.senha || f.senha.length >= 4);

  return (
    <Janela titulo={novo ? "Novo usuário" : "Editar usuário"} largo onFechar={onFechar}>
      <form
        className="form-colab"
        autoComplete="off"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalvando(true);
          setErro(null);
          try {
            await onSalvar(f);
          } catch (er) {
            setErro((er as Error).message);
            setSalvando(false);
          }
        }}
      >
        <label className="campo"><span>Nome completo</span><input value={f.nome} onChange={(e) => set({ nome: e.target.value.toUpperCase() })} autoFocus /></label>
        <div className="duas">
          <label className="campo">
            <span>Usuário de acesso</span>
            <input value={f.usuario} onChange={(e) => set({ usuario: e.target.value })} autoCapitalize="off" spellCheck={false} disabled={euMesmo} />
          </label>
          <label className="campo">
            <span>{novo ? "Senha" : "Nova senha"}</span>
            <div className="senha">
              <input type={ver ? "text" : "password"} value={f.senha} onChange={(e) => set({ senha: e.target.value })} placeholder={novo ? "" : "Deixe em branco para manter"} autoComplete="new-password" />
              <button type="button" className="link" onClick={() => setVer((v) => !v)}>{ver ? "Ocultar" : "Mostrar"}</button>
            </div>
          </label>
        </div>
        <div className="duas">
          <label className="campo"><span>Chapa</span><input value={f.chapa} onChange={(e) => set({ chapa: e.target.value })} inputMode="numeric" /></label>
          <label className="campo"><span>Função</span><input value={f.funcao} onChange={(e) => set({ funcao: e.target.value.toUpperCase() })} /></label>
        </div>
        <div className="duas">
          <label className="campo">
            <span>Base</span>
            <select value={f.base} onChange={(e) => set({ base: e.target.value })}><option value="">—</option>{BASES.map((b) => <option key={b}>{b}</option>)}</select>
          </label>
          <label className="campo">
            <span>Gerência</span>
            <select value={f.gerencia} onChange={(e) => set({ gerencia: e.target.value })}><option value="">—</option>{GERENCIAS.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
        </div>
        <label className="campo">
          <span>Perfil de acesso</span>
          <select value={f.admin ? "admin" : "leitor"} onChange={(e) => set({ admin: e.target.value === "admin" })} disabled={euMesmo}>
            <option value="leitor">Somente relatórios (Escola de Segurança, Avaliação e Detalhamento)</option>
            <option value="admin">Administrador (também Questões, Configuração e Usuários)</option>
          </select>
        </label>
        <label className="q-check">
          <input type="checkbox" checked={f.ativo} onChange={(e) => set({ ativo: e.target.checked })} disabled={euMesmo} />
          <span>Acesso ativo</span>
        </label>
        {euMesmo && <p className="sub">Você não pode alterar o seu próprio usuário, perfil ou situação. A senha pode ser trocada.</p>}
        {erro && <p className="erro-msg">{erro}</p>}
        <div className="acoes">
          <button type="button" className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn" disabled={!ok || salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}
