import { useState } from "react";
import { Fundo, Logo } from "../../components/Logo";
import { TemaBotao } from "../../lib/tema";

export default function Login({ onEntrar }: { onEntrar: () => void }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tremer, setTremer] = useState(0);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, senha }) });
      if (!r.ok) throw new Error((await r.json()).erro);
      onEntrar();
    } catch (e) {
      setErro((e as Error).message || "Falha de conexão.");
      setTremer((n) => n + 1);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="app-login">
      <Fundo />
      <TemaBotao flutuante />
      <form className={`cartao-login ${tremer ? "tremer" : ""}`} key={tremer} onSubmit={entrar}>
        <Logo tamanho={84} neon />
        <h1>Relatórios <em>Escola de Segurança</em></h1>
        <p className="sub">Acesso restrito à administração.</p>
        <label className="campo">
          <span>Usuário</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="off" spellCheck={false} autoFocus />
        </label>
        <label className="campo">
          <span>Senha</span>
          <div className="senha">
            <input type={ver ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
            <button type="button" className="link" onClick={() => setVer((v) => !v)}>{ver ? "Ocultar" : "Mostrar"}</button>
          </div>
        </label>
        {erro && <p className="erro-msg">{erro}</p>}
        <button className="btn" disabled={enviando || !usuario || !senha}>{enviando ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
