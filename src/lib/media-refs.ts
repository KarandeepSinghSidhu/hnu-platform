// Image fields may hold either a raw path ("/uploads/media/123-x.jpg" — legacy
// or manual entry) or a reference to a MediaAsset by id ("media:42"). Storing a
// reference means the link survives the file being replaced. Pure helpers —
// safe to import from client and server.

const PREFIX = "media:";

export function toMediaRef(id: number): string {
  return `${PREFIX}${id}`;
}

export function parseMediaRef(value: unknown): number | null {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return null;
  const id = Number(value.slice(PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function isMediaRef(value: unknown): boolean {
  return parseMediaRef(value) !== null;
}
