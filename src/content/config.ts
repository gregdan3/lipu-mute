import { defineCollection, reference, z } from "astro:content";

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
  type: "content",
  schema: z.object({ ...blogSchema }),
});

export const collections = {
  blog: blogCollection,
};
