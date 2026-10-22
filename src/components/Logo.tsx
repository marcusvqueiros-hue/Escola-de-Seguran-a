export function Logo({ tamanho = 44, texto = true }: { tamanho?: number; texto?: boolean }) {
  return (
    <span className="logo" style={{ ["--t" as string]: `${tamanho}px` }}>
      <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b01f3c" />
            <stop offset="1" stopColor="#5e0f1e" />
          </linearGradient>
        </defs>
        <rect x="9" y="9" width="46" height="46" rx="10" transform="rotate(45 32 32)" fill="url(#lg)" />
        <path d="M32 17l5.2 11.6 11.8 3.4-11.8 3.4L32 47l-5.2-11.6L15 32l11.8-3.4z" fill="#fff" opacity=".93" />
      </svg>
      {texto && <b>CGB</b>}
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
