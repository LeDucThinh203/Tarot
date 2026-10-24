export function getRuntimeDatabaseUrl(url: string): string {
  if (url.startsWith('file:./prisma/')) return url;
  if (!url.startsWith('file:./')) return url;
  return `file:./prisma/${url.slice('file:./'.length)}`;
}
