import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import Avaliacao from "./pages/avaliacao/Avaliacao";
import { iniciarPWA } from "./lib/pwa";

const Painel = lazy(() => import("./pages/painel/Painel"));
const noPainel = location.pathname.startsWith("/painel");

iniciarPWA();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {noPainel ? (
      <Suspense fallback={<div className="carregando">Carregando…</div>}>
        <Painel />
      </Suspense>
    ) : (
      <Avaliacao />
    )}
  </StrictMode>,
);
