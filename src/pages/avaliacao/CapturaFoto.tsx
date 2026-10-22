import { useEffect, useRef, useState } from "react";
import { carimbar, formatarDataHora, obterLocal, type Local } from "./carimbo";

interface Props {
  nome: string;
  matricula: string;
  enviando: boolean;
  erroEnvio: string | null;
  onConfirmar: (foto: string, local: Local, carimbo: string) => void;
}

export default function CapturaFoto({ nome, matricula, enviando, erroEnvio, onConfirmar }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [frente, setFrente] = useState(true);
  const [cameraOk, setCameraOk] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [local, setLocal] = useState<Local | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(true);
  const [agora, setAgora] = useState(new Date());
  const [proporcao, setProporcao] = useState(4 / 3);
  const [foto, setFoto] = useState<{ url: string; quando: Date } | null>(null);

  const buscarLocal = () => {
    setBuscandoLocal(true);
    setErroLocal(null);
    obterLocal()
      .then(setLocal)
      .catch((e: Error) => setErroLocal(e.message))
      .finally(() => setBuscandoLocal(false));
  };
  useEffect(buscarLocal, []);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (foto) return;
    let cancelado = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOk(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroCamera("Câmera indisponível neste navegador (é preciso abrir o link em HTTPS).");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: frente ? "user" : "environment" }, width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelado) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        setErroCamera(null);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraOk(true);
      })
      .catch(() => !cancelado && setErroCamera("Não foi possível acessar a câmera. Libere a permissão ou use o botão abaixo."));
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [frente, foto]);

  const capturar = () => {
    const v = videoRef.current;
    if (!v || !local || !v.videoWidth) return;
    const quando = new Date();
    setFoto({ url: carimbar(v, v.videoWidth, v.videoHeight, { quando, local, nome, matricula }), quando });
  };

  const doArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq || !local) return;
    const img = new Image();
    img.onload = () => {
      const quando = new Date();
      setProporcao(img.naturalWidth / img.naturalHeight);
      setFoto({ url: carimbar(img, img.naturalWidth, img.naturalHeight, { quando, local, nome, matricula }), quando });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(arq);
  };

  const pronto = !!local;

  return (
    <div className="foto">
      <div className={`visor ${foto ? "tirada" : ""}`} style={{ aspectRatio: proporcao }}>
        {foto ? (
          <img src={foto.url} alt="Foto carimbada" />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={frente ? "espelho" : ""}
              onLoadedMetadata={(e) => e.currentTarget.videoWidth && setProporcao(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
            />
            {!cameraOk && <div className="visor-vazio">{erroCamera ?? "Abrindo a câmera…"}</div>}
            {cameraOk && (
              <div className="carimbo-vivo">
                <b>{formatarDataHora(agora)}</b>
                <span>{local ? local.endereco : buscandoLocal ? "Obtendo localização…" : "Localização indisponível"}</span>
              </div>
            )}
            <i className="mira c1" /><i className="mira c2" /><i className="mira c3" /><i className="mira c4" />
          </>
        )}
      </div>

      <div className={`status-local ${pronto ? "ok" : erroLocal ? "erro" : ""}`}>
        <span className="ponto" />
        {pronto ? (
          <>Localização registrada · ±{local!.precisao} m</>
        ) : buscandoLocal ? (
          <>Obtendo localização…</>
        ) : (
          <>
            {erroLocal} <button className="link" onClick={buscarLocal}>Tentar de novo</button>
          </>
        )}
      </div>

      {foto ? (
        <>
          {erroEnvio && <p className="erro-msg">{erroEnvio}</p>}
          <div className="acoes">
            <button className="btn sec" onClick={() => setFoto(null)} disabled={enviando}>Refazer foto</button>
            <button className="btn" disabled={enviando || !local} onClick={() => onConfirmar(foto.url, local!, foto.quando.toISOString())}>
              {enviando ? "Enviando…" : "Finalizar avaliação"}
            </button>
          </div>
        </>
      ) : (
        <div className="acoes">
          {cameraOk && (
            <button className="btn sec icone" onClick={() => setFrente((f) => !f)} title="Alternar câmera" aria-label="Alternar câmera">⟲</button>
          )}
          {cameraOk ? (
            <button className="btn obturador" onClick={capturar} disabled={!pronto} aria-label="Tirar foto">
              <span />
            </button>
          ) : (
            <label className={`btn ${pronto ? "" : "desativado"}`}>
              Tirar foto com o aparelho
              <input type="file" accept="image/*" capture="user" hidden disabled={!pronto} onChange={doArquivo} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
