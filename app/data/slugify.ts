export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[:']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}