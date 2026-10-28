/** The six-digit lower-case colour a hex field holds, or null when it holds none. */
export function normalizeHex(text: string): string | null {
  const t = text.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(t)) {
    return `#${t[0]}${t[0]}${t[1]}${t[1]}${t[2]}${t[2]}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}
