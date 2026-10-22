import { api } from "../server/handlers";

export default { fetch: (req: Request) => api(req) };
