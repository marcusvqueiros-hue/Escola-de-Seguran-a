import { api } from "../server/handlers";

// vercel.json reescreve /api/* para cá, passando o caminho original em ?p=
export default {
  fetch(req: Request) {
    const u = new URL(req.url);
    const p = u.searchParams.get("p");
    if (p) {
      u.pathname = `/api/${p.replace(/^\/+/, "")}`;
      u.searchParams.delete("p");
    }
    return api(new Request(u, req));
  },
};
