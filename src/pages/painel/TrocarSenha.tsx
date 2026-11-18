import { useState } from "react";
import { Fundo, Logo, Rodape } from "../../components/Logo";
import { TemaBotao } from "../../lib/tema";
import { Janela } from "./Configuracao";

/** Regras iguais às do servidor (que é quem decide). */
function problema(atual: string, nova: string, confirma: string): string | null {
  if (!atual) return "Informe a senha atual.";
  if (nova.length < 8) return "A nova senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(nova) || !/\d/.test(nova)) return "Use letras e números na nova senha.";
  if (nova === atual) return "A nova senha precisa ser diferente da atual.";
  if (nova !== confirma) return "A confirmação não confere com a nova senha.";
  return null;
}

function Formulario({ obrigatoria, onConcluir, onCancelar }: { obrigatoria: boolean; onConcluir: () => void; onCancelar?: () => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const local = problema(atual, nova, confirma);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ atual, nova }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível alterar a senha.");
      onConcluir();
    } catch (er) {
      setErro((er as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className={obrigatoria ? "" : "form-colab"} autoComplete="off">
      <label className="campo">
        <span>{obrigatoria ? "Senha provisória (a que você recebeu)" : "Senha atual"}</span>
        <input type={ver ? "text" : "password"} value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" autoFocus />
      </label>
      <label className="campo">
        <span>Nova senha</span>
        <input type={ver ? "text" : "password"} value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />
      </label>
      <label className="campo">
        <span>Confirmar nova senha</span>
        <div className="senha">
          <input type={ver ? "text" : "password"} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
          <button type="button" className="link" onClick={() => setVer((v) => !v)}>{ver ? "Ocultar" : "Mostrar"}</button>
        </div>
      </label>
      <ul className="senha-regras">
        <li className={nova.length >= 8 ? "ok" : ""}>Pelo menos 8 caracteres</li>
        <li className={/[A-Za-z]/.test(nova) && /\d/.test(nova) ? "ok" : ""}>Letras e números</li>
        <li className={nova !== "" && nova === confirma ? "ok" : ""}>Confirmação igual à nova senha</li>
      </ul>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="acoes">
        {onCancelar && <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>}
        <button className="btn" disabled={!!local || enviando}>{enviando ? "Salvando…" : "Salvar nova senha"}</button>
      </div>
    </form>
  );
}

/** Primeiro acesso (ou senha redefinida por um administrador): tela cheia, sem acesso aos relatórios até trocar. */
export default function TrocarSenha({ onConcluir, onSair }: { onConcluir: () => void; onSair: () => void }) {
  return (
    <main className="app-login">
      <Fundo />
      <TemaBotao flutuante />
      <div className="cartao-login">
        <Logo tamanho={84} neon />
        <h1>Defina sua <em>nova senha</em></h1>
        <p className="sub">Este é o seu primeiro acesso, ou sua senha foi redefinida. Escolha uma senha pessoal para continuar.</p>
        <Formulario obrigatoria onConcluir={onConcluir} />
        <button type="button" className="link" onClick={onSair}>Sair</button>
      </div>
      <Rodape />
    </main>
  );
}

/** Troca voluntária, aberta pelo menu. */
export function JanelaSenha({ onFechar }: { onFechar: () => void }) {
  const [feito, setFeito] = useState(false);
  return (
    <Janela titulo="Alterar senha" onFechar={onFechar}>
      {feito ? (
        <>
          <p className="aviso-ok" role="status">Senha alterada com sucesso.</p>
          <div className="acoes"><button className="btn" onClick={onFechar}>Fechar</button></div>
        </>
      ) : (
        <Formulario obrigatoria={false} onConcluir={() => setFeito(true)} onCancelar={onFechar} />
      )}
    </Janela>
  );
}
