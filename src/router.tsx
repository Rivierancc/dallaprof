import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { stripSlug } from "./lib/venue";
import { pageSlug } from "./lib/venue-iso";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // /<sigla>/cucina apre la pagina Cucina di quel locale; i link restano nel locale.
    rewrite: {
      input: ({ url }) => {
        const { slug, path } = stripSlug(url.pathname);
        if (!slug) return undefined;
        url.pathname = path;
        return url;
      },
      output: ({ url }) => {
        const slug = pageSlug();
        if (!slug || url.pathname.startsWith("/superadmin")) return undefined;
        url.pathname = `/${slug}${url.pathname === "/" ? "" : url.pathname}`;
        return url;
      },
    },
  });

  return router;
};
