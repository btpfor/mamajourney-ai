/**
 * Point d'entrée Cloudflare Worker.
 * Réexporte le dispatcher défini dans `index.ts` afin qu'on puisse pointer
 * `wrangler.toml` (main) sur `src/worker.ts` aussi bien que `src/index.ts`.
 */
import worker, { onRequest } from "./index";

export { onRequest };
export default worker;