// @ts-expect-error: post type is not clear?
export function isPublished(post) {
  if (import.meta.env.DEV) return true;
  if (!post.body) return false;
  if (!post.data.published) return false;
  if (post.date && !(post.data.date >= new Date())) return false;
  return true;
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
