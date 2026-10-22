export interface Local {
  lat: number;
  lng: number;
  precisao: number;
  endereco: string;
}

export const formatarDataHora = (d: Date) =>
  `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;

function posicao(): Promise<GeolocationPosition> {
  return new Promise((ok, falha) => {
    if (!navigator.geolocation) return falha(new Error("Este aparelho não oferece geolocalização."));
    navigator.geolocation.getCurrentPosition(ok, falha, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
  });
}

export async function obterLocal(): Promise<Local> {
  let p: GeolocationPosition;
  try {
    p = await posicao();
  } catch (e) {
    const code = (e as GeolocationPositionError).code;
    throw new Error(
      code === 1
        ? "Permissão de localização negada. Libere o acesso à localização do navegador e tente novamente."
        : "Não foi possível obter a localização. Verifique o GPS e tente novamente.",
    );
  }
  const { latitude: lat, longitude: lng, accuracy } = p.coords;
  let endereco = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=pt-BR&lat=${lat}&lon=${lng}`,
      { signal: ctl.signal },
    );
    clearTimeout(t);
    const a = (await r.json()).address ?? {};
    const rua = a.road ?? a.pedestrian ?? a.path;
    const bairro = a.suburb ?? a.neighbourhood ?? a.quarter;
    const cidade = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county;
    const uf = a["ISO3166-2-lvl4"]?.split("-")[1] ?? a.state;
    const partes = [rua, bairro, cidade && uf ? `${cidade} - ${uf}` : (cidade ?? uf)].filter(Boolean);
    if (partes.length) endereco = partes.join(", ");
  } catch {
    /* sem internet para o endereço: o carimbo mantém as coordenadas */
  }
  return { lat, lng, precisao: Math.round(accuracy), endereco };
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(" ")) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Redimensiona (lado maior ≤ 1280), aplica o carimbo de data/hora/local e devolve um JPEG em data URL. */
export function carimbar(
  fonte: CanvasImageSource,
  largura: number,
  altura: number,
  info: { quando: Date; local: Local; nome: string; matricula: string },
) {
  const esc = Math.min(1, 1280 / Math.max(largura, altura));
  const w = Math.round(largura * esc);
  const h = Math.round(altura * esc);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(fonte, 0, 0, w, h);

  const f = Math.max(14, Math.round(w * 0.026));
  const pad = Math.round(f * 0.8);
  ctx.textBaseline = "top";

  ctx.font = `${f}px system-ui, sans-serif`;
  const endereco = quebrar(ctx, info.local.endereco, w - pad * 2);
  const linhas = [
    { t: formatarDataHora(info.quando), fonte: `700 ${Math.round(f * 1.35)}px system-ui, sans-serif`, cor: "#fff" },
    ...endereco.map((t) => ({ t, fonte: `${f}px system-ui, sans-serif`, cor: "#fff" })),
    {
      t: `Lat ${info.local.lat.toFixed(5)} · Lng ${info.local.lng.toFixed(5)} · ±${info.local.precisao} m`,
      fonte: `${Math.round(f * 0.85)}px system-ui, sans-serif`,
      cor: "#e5d9dc",
    },
    { t: `${info.nome} · Mat. ${info.matricula} · Escola de Segurança CGB`, fonte: `${Math.round(f * 0.85)}px system-ui, sans-serif`, cor: "#e5d9dc" },
  ];
  const alturas = linhas.map((l) => parseInt(l.fonte.match(/(\d+)px/)![1]!) * 1.3);
  const faixa = alturas.reduce((a, b) => a + b, 0) + pad * 2;

  const g = ctx.createLinearGradient(0, h - faixa - pad, 0, h);
  g.addColorStop(0, "rgba(20,5,10,0)");
  g.addColorStop(0.35, "rgba(20,5,10,.78)");
  g.addColorStop(1, "rgba(20,5,10,.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - faixa - pad, w, faixa + pad);

  let y = h - faixa + pad / 2;
  linhas.forEach((l, i) => {
    ctx.font = l.fonte;
    ctx.fillStyle = l.cor;
    ctx.fillText(l.t, pad, y);
    y += alturas[i]!;
  });
  return c.toDataURL("image/jpeg", 0.85);
}
