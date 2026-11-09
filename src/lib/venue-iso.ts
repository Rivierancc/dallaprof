import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { browserSlug, slugFromPath } from "@/lib/venue";

/** Sigla scritta nell'indirizzo della pagina aperta (sia sul server sia nel browser). */
export const pageSlug = createIsomorphicFn()
  .server(() => { try { return slugFromPath(new URL(getRequest().url).pathname); } catch { return null; } })
  .client(() => browserSlug());
