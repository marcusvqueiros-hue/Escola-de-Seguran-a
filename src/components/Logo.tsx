import logo from "../assets/logo-cgb.png";

/** Logotipo oficial da CGB; `tamanho` é a altura em px. */
export function Logo({ tamanho = 44 }: { tamanho?: number; texto?: boolean }) {
  return (
    <span className="logo">
      <img src={logo} alt="CGB" height={tamanho} style={{ height: tamanho, width: "auto" }} />
    </span>
  );
}

export function Fundo() {
  return (
    <div className="fundo" aria-hidden>
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <i className="grade" />
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} className="particula" style={{ ["--i" as string]: i }} />
      ))}
    </div>
  );
}
