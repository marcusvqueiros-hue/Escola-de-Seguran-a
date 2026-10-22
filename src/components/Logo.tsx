import { useEffect, useRef } from "react";
import logo from "../assets/logo-cgb.png";

/** Logotipo oficial da CGB; `tamanho` é a altura em px. */
export function Logo({ tamanho = 44 }: { tamanho?: number; texto?: boolean }) {
  return (
    <span className="logo">
      <img src={logo} alt="CGB" height={tamanho} style={{ height: tamanho, width: "auto" }} />
    </span>
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
      const rgb = escuro ? "240,169,184" : "132,22,43";
      ctx.clearRect(0, 0, w, h);

      for (const no of nos) {
        no.x += no.vx * dt;
        no.y += no.vy * dt;
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

      for (const no of nos) {
        ctx.fillStyle = `rgba(${rgb},${escuro ? 0.55 : 0.4})`;
        ctx.beginPath();
        ctx.arc(no.x, no.y, no.r, 0, Math.PI * 2);
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
        const A = nos[p.a]!, B = nos[p.b]!;
        if (Math.hypot(A.x - B.x, A.y - B.y) > dist) { p.t = 1; continue; }
        const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, `rgba(${escuro ? "255,200,210" : "208,69,101"},0.9)`);
        g.addColorStop(1, `rgba(${escuro ? "255,200,210" : "208,69,101"},0)`);
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
      <RedeNeural />
    </div>
  );
}
