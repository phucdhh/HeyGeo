/**
 * Authored-page models.
 *
 * A model whose jsonData carries a whole HTML document is not something HeyGeo
 * can interpret as geometry: it is a page the platform only displays, in a
 * script-only sandbox iframe.  Two types are of that shape — 'gx' (a Geometry
 * Expressions export) and 'html' (a page the user or their AI assistant wrote).
 *
 * The designer must never open them: casting htmlContent to HeyGeoData yields an
 * empty board, and saving that board overwrites the page.
 */

export type HtmlPageType = 'gx' | 'html';

export function htmlPageType(jsonData: unknown): HtmlPageType | null {
  const rec = jsonData as Record<string, unknown> | null;
  if (!rec || typeof rec.htmlContent !== 'string') return null;
  return rec.__type === 'gx' ? 'gx' : 'html';
}

/** The editor route for a page model, whatever type it carries. */
export function htmlEditorUrl(modelId: string): string {
  return `/html?id=${modelId}`;
}

/** Placeholder shown on gallery and dashboard cards for a plain-HTML model. */
export const HTML_THUMB_SVG = `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="120" fill="#f1f5f9"/><rect x="26" y="18" width="148" height="80" rx="8" fill="none" stroke="#64748b" stroke-width="2"/><line x1="26" y1="38" x2="174" y2="38" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="38" cy="28" r="3" fill="#94a3b8"/><circle cx="50" cy="28" r="3" fill="#94a3b8"/><circle cx="62" cy="28" r="3" fill="#94a3b8"/><path d="M 74 58 L 60 72 L 74 86" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M 126 58 L 140 72 L 126 86" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="112" y1="54" x2="96" y2="90" stroke="#475569" stroke-width="3" stroke-linecap="round"/><text x="100" y="116" text-anchor="middle" font-size="9" fill="#475569" font-family="sans-serif" font-weight="600">HTML</text></svg>`;

/** Starting point for a page written here rather than uploaded. */
export const BLANK_HTML_PAGE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mô hình HTML</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; }
  </style>
</head>
<body>
  <h1>Mô hình HTML của bạn</h1>
  <script>
    // Dán trang HTML do bạn hoặc trợ lý AI viết vào đây, rồi bấm ▶ để xem thử.
  </script>
</body>
</html>
`;
