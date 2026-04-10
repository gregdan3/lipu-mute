import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import compress from "@playform/compress";
import robotsTxt from "astro-robots-txt";
import purgecss from "astro-purgecss";
import inline from "@playform/inline";

import icon from "astro-icon";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://ilo.muni.la/",
  redirects: {
    "/about": "/blog/about",
    "/about.html": "/blog/about",
    "/help": "/blog/help",
    "/help.html": "/blog/help",
  },
  base: "",
  publicDir: "./static",
  integrations: [
    mdx(),
    sitemap(),
    icon({ iconDir: "src/icons" }),
    purgecss(),
    inline(),
    robotsTxt(),
    compress(),
    svelte(),
  ],
  markdown: {
    remarkPlugins: [
      [
        remarkToc,
        {
          heading: "Table of Contents",
          maxDepth: 4,
        },
      ],
    ],
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  devToolbar: {
    enabled: true,
  },
  experimental: {
    rustCompiler: true,
  },
});