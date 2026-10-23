import { useEffect, useRef } from "react";
import logo from "../assets/logo-cgb.png";

/**
 * Logotipo oficial da CGB (imagem original, sem alterar forma nem tipografia).
 * Ícone e letras são recortes da mesma imagem, o que permite clarear só as letras sobre fundos escuros.
 * `tamanho` é a altura em px.
 */
export function Logo({ tamanho = 44, neon = false }: { tamanho?: number; texto?: boolean; neon?: boolean }) {
  const u = tamanho / 596;
  const base = { backgroundImage: `url(${logo})`, backgroundSize: `${1500 * u}px ${596 * u}px`, height: tamanho };
  const letras = <i className="logo-letras" style={{ ...base, width: 1058 * u, backgroundPosition: `${-442 * u}px 0` }} />;
  if (!neon) {
    return (
      <span className="logo" role="img" aria-label="CGB" style={{ height: tamanho }}>
        <i className="logo-icone" style={{ ...base, width: 442 * u, backgroundPosition: "0 0" }} />
        {letras}
      </span>
    );
  }
  // Versão neon: linhas finas na forma original. O símbolo é redesenhado telha a telha (com as arestas internas
  // visíveis) e as letras viram contorno com um leve preenchimento; o brilho "respira".
  const linha = Math.max(1, tamanho / 62);
  const raio = Math.max(0.7, tamanho / 92);
  return (
    <span className="logo-neon">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="logo-contorno" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="erode" radius={raio} result="miolo" />
          <feComposite in="SourceAlpha" in2="miolo" operator="out" result="borda" />
          <feFlood style={{ floodColor: "var(--neon)" }} result="cor" />
          <feComposite in="cor" in2="borda" operator="in" result="linha" />
          <feFlood style={{ floodColor: "var(--neon)" }} floodOpacity="0.05" result="cor2" />
          <feComposite in="cor2" in2="SourceAlpha" operator="in" result="preench" />
          <feMerge>
            <feMergeNode in="preench" />
            <feMergeNode in="linha" />
          </feMerge>
        </filter>
      </svg>
      <span className="logo-neon-vaza">
        <span className="logo" role="img" aria-label="CGB" style={{ height: tamanho }}>
          <svg viewBox="0 0 442 596" width={442 * u} height={tamanho} className="logo-icone-neon" aria-hidden>
            {TELHAS.map(([pts]) => (
              <polygon key={pts} points={pts} fill="none" strokeWidth={linha} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            ))}
          </svg>
          {letras}
        </span>
      </span>
    </span>
  );
}

const TELHAS: [string, string][] = [
  ["198,0 297,99 198,198 99,99", "#721626"],
  ["0,198 99,99 198,198 99,297", "#a01840"],
  ["198,198 297,99 398,198 297,297", "#7e162b"],
  ["0,198 99,297 0,397", "#c0245a"],
  ["398,198 398,397 297,297", "#a01840"],
  ["99,297 198,397 99,496 0,397", "#a01840"],
  ["297,297 398,397 297,496 198,397", "#7e162b"],
  ["198,397 297,496 198,596 99,496", "#721626"],
];

/** Forma geométrica inspirada no símbolo da CGB (losango de telhas com vazado no centro). */
function FormaCGB() {
  return (
    <svg className="forma-cgb" viewBox="0 0 398 596" aria-hidden>
      {TELHAS.map(([pts, cor]) => (
        <polygon key={pts} points={pts} fill={cor} />
      ))}
    </svg>
  );
}

interface No { x: number; y: number; vx: number; vy: number; r: number }
interface Pulso { a: number; b: number; t: number; v: number }

/** Rede de conexões em movimento: nós à deriva, ligados por linhas quando próximos, com pulsos viajando pelas ligações. */
function RedeNeural() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, nos: No[] = [], pulsos: Pulso[] = [], raf = 0, ultimo = performance.now(), proximoPulso = 0;
    let dist = 150;
    // ponteiro (mouse ou toque): vira um nó extra que puxa e conecta os nós próximos
    const ponteiro = { x: 0, y: 0, ativo: false, forca: 0 };
    const mover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ponteiro.x = e.clientX - r.left;
      ponteiro.y = e.clientY - r.top;
      ponteiro.ativo = true;
    };
    const sair = () => (ponteiro.ativo = false);
    const clicar = (e: PointerEvent) => {
      mover(e);
      const alvos = nos.map((n, i) => ({ i, d: Math.hypot(n.x - ponteiro.x, n.y - ponteiro.y) })).filter((a) => a.d < 240).slice(0, 10);
      for (const a of alvos) pulsos.push({ a: -1, b: a.i, t: 0, v: 1.2 + Math.random() * 0.6 });
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerdown", clicar);
    document.addEventListener("pointerleave", sair);
    window.addEventListener("blur", sair);

    const montar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dist = w < 640 ? 120 : 160;
      const n = Math.round(Math.min(70, Math.max(22, (w * h) / 22000)));
      nos = Array.from({ length: n }, () => {
        const ang = Math.random() * Math.PI * 2;
        const vel = 8 + Math.random() * 16;
        return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, r: 1.2 + Math.random() * 1.6 };
      });
      pulsos = [];
    };

    const quadro = (agora: number) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      const escuro = document.documentElement.dataset.tema === "escuro";
      const rgb = escuro ? "232,137,159" : "168,50,78";
      ctx.clearRect(0, 0, w, h);

      const alcance = w < 640 ? 150 : 210;
      ponteiro.forca += ((ponteiro.ativo ? 1 : 0) - ponteiro.forca) * Math.min(1, dt * 6);
      const neon = escuro ? "232,137,159" : "168,50,78";

      for (const no of nos) {
        no.x += no.vx * dt;
        no.y += no.vy * dt;
        if (ponteiro.forca > 0.02) {
          const dx = ponteiro.x - no.x, dy = ponteiro.y - no.y;
          const d = Math.hypot(dx, dy);
          if (d < alcance && d > 1) {
            const f = (1 - d / alcance) * 55 * ponteiro.forca * dt;
            no.x += (dx / d) * f * 6;
            no.y += (dy / d) * f * 6;
          }
        }
        if (no.x < -20) no.x = w + 20; else if (no.x > w + 20) no.x = -20;
        if (no.y < -20) no.y = h + 20; else if (no.y > h + 20) no.y = -20;
      }

      const ligacoes: [number, number][] = [];
      ctx.lineWidth = 1;
      for (let i = 0; i < nos.length; i++) {
        for (let j = i + 1; j < nos.length; j++) {
          const dx = nos[i]!.x - nos[j]!.x, dy = nos[i]!.y - nos[j]!.y;
          const d = Math.hypot(dx, dy);
          if (d < dist) {
            ligacoes.push([i, j]);
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / dist) * (escuro ? 0.32 : 0.28)})`;
            ctx.beginPath();
            ctx.moveTo(nos[i]!.x, nos[i]!.y);
            ctx.lineTo(nos[j]!.x, nos[j]!.y);
            ctx.stroke();
          }
        }
      }

      // conexões do ponteiro com os nós ao redor
      if (ponteiro.forca > 0.02) {
        const perto = nos
          .map((n) => ({ n, d: Math.hypot(n.x - ponteiro.x, n.y - ponteiro.y) }))
          .filter((a) => a.d < alcance)
          .sort((a, b) => a.d - b.d)
          .slice(0, 12);
        ctx.lineWidth = 1.3;
        for (const { n, d } of perto) {
          ctx.strokeStyle = `rgba(${neon},${(1 - d / alcance) * 0.45 * ponteiro.forca})`;
          ctx.beginPath();
          ctx.moveTo(ponteiro.x, ponteiro.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        const halo = ctx.createRadialGradient(ponteiro.x, ponteiro.y, 0, ponteiro.x, ponteiro.y, 46);
        halo.addColorStop(0, `rgba(${neon},${0.14 * ponteiro.forca})`);
        halo.addColorStop(1, `rgba(${neon},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ponteiro.x, ponteiro.y, 46, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const no of nos) {
        const d = ponteiro.forca > 0.02 ? Math.hypot(no.x - ponteiro.x, no.y - ponteiro.y) : 1e9;
        const realce = d < alcance ? (1 - d / alcance) * ponteiro.forca : 0;
        ctx.fillStyle = realce > 0.02 ? `rgba(${neon},${0.45 + realce * 0.3})` : `rgba(${rgb},${escuro ? 0.55 : 0.4})`;
        ctx.beginPath();
        ctx.arc(no.x, no.y, no.r + realce * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      proximoPulso -= dt;
      if (proximoPulso <= 0 && ligacoes.length) {
        const [a, b] = ligacoes[Math.floor(Math.random() * ligacoes.length)]!;
        pulsos.push(Math.random() < 0.5 ? { a, b, t: 0, v: 0.6 + Math.random() * 0.5 } : { a: b, b: a, t: 0, v: 0.6 + Math.random() * 0.5 });
        proximoPulso = 0.15 + Math.random() * 0.3;
      }
      pulsos = pulsos.filter((p) => p.t < 1);
      for (const p of pulsos) {
        p.t += dt * p.v;
        const A = p.a < 0 ? { x: ponteiro.x, y: ponteiro.y } : nos[p.a]!, B = nos[p.b]!;
        if (p.a >= 0 && Math.hypot(A.x - B.x, A.y - B.y) > dist) { p.t = 1; continue; }
        const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, `rgba(${escuro ? "232,137,159" : "168,50,78"},0.55)`);
        g.addColorStop(1, `rgba(${escuro ? "232,137,159" : "168,50,78"},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!parado) raf = requestAnimationFrame(quadro);
    };

    montar();
    raf = requestAnimationFrame(quadro);
    const obs = new ResizeObserver(montar);
    obs.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerdown", clicar);
      document.removeEventListener("pointerleave", sair);
      window.removeEventListener("blur", sair);
    };
  }, []);

  return <canvas ref={ref} className="rede" aria-hidden />;
}

export function Fundo() {
  return (
    <div className="fundo" aria-hidden>
      <i className="blob b1" />
      <i className="blob b2" />
      <i className="blob b3" />
      <FormaCGB />
      <RedeNeural />
    </div>
  );
}
