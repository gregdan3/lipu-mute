import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blogSchema = {
  title: z.string(),
  author: z.string().optional(),
  authorLink: z.string().url().optional(),
  description: z.string().optional(),

  date: z.date(),
  updated: z.date().optional(),
  published: z.boolean().default(false),

  related: z.array(reference("blog")).optional(),
  layout: z.string().default("@layouts/Blog.astro"),
};

export const blogCollection = defineCollection({
  schema: z.object({ ...blogSchema }),
  loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/content/blog" }),
});

export const collections = {
  blog: blogCollection,
};
