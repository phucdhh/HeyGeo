/**
 * Server-side GeoGebra 3D detection.
 *
 * A .ggb file is a ZIP archive.  3D is indicated by EITHER:
 *   (a) the presence of "geogebra3d.xml" (a separate file for 3D geometry objects), OR
 *   (b) view id="512" visible="true" inside "geogebra.xml" (the 3D Graphics view is open)
 *
 * This function runs on the server where Node.js `zlib` is available, so we can
 * properly DEFLATE-decompress "geogebra.xml" to check condition (b).
 */
import zlib from 'zlib';

export function detectIs3DServer(base64: string): boolean {
  try {
    const buf = Buffer.from(base64, 'base64');
    let i = 0;
    while (i < buf.length - 30) {
      // ZIP local file header signature: PK\x03\x04
      if (buf[i] !== 0x50 || buf[i + 1] !== 0x4B || buf[i + 2] !== 0x03 || buf[i + 3] !== 0x04) {
        i++;
        continue;
      }
      const method    = buf.readUInt16LE(i + 8);
      const compSize  = buf.readUInt32LE(i + 18);
      const fnLen     = buf.readUInt16LE(i + 26);
      const extraLen  = buf.readUInt16LE(i + 28);
      const fname     = buf.slice(i + 30, i + 30 + fnLen).toString();
      const dataStart = i + 30 + fnLen + extraLen;

      // (a) Dedicated 3D-objects file present → definitely 3D
      if (fname === 'geogebra3d.xml') return true;

      // (b) Main XML present → decompress and check for visible 3D Graphics view
      if (fname === 'geogebra.xml') {
        const compressed = buf.slice(dataStart, dataStart + compSize);
        let xml = '';
        try {
          xml = (method === 8 ? zlib.inflateRawSync(compressed) : compressed).toString('utf8');
        } catch { /* corrupt file – fall through */ }
        // GeoGebra view id 512 = 3D Graphics view
        if (/id="512"[^>]*visible="true"/.test(xml)) return true;
      }

      i += 30 + fnLen + extraLen + compSize;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * If `jsonData` is a GeoGebra record, re-compute and set `is3d` on the server
 * so it is always accurate regardless of what the client submitted.
 */
export function enrichGgbJsonData(jsonData: unknown): unknown {
  if (
    typeof jsonData !== 'object' ||
    jsonData === null ||
    (jsonData as Record<string, unknown>).__type !== 'geogebra'
  ) {
    return jsonData;
  }
  const rec = jsonData as Record<string, unknown>;
  const b64 = typeof rec.base64 === 'string' ? rec.base64 : '';
  if (!b64) return jsonData;
  return { ...rec, is3d: detectIs3DServer(b64) };
}

/**
 * Returns the tool category name for a given jsonData record, or null if unknown.
 * - No __type + codeMode:true  → JSXGraph (coded on /coding page)
 * - No __type + no codeMode    → HeyGeo  (designed on /design or uploaded)
 */
export function toolCategoryFromJson(jsonData: unknown): string | null {
  if (!jsonData || typeof jsonData !== 'object') return 'HeyGeo';
  const rec = jsonData as Record<string, unknown>;
  const type = rec.__type;
  if (!type) {
    // Distinguish HeyGeo designer vs JSXGraph coder by codeMode flag
    return rec.codeMode === true ? 'JSXGraph' : 'HeyGeo';
  }
  switch (type) {
    case 'heygeo':    return 'HeyGeo';
    case 'jsxgraph':  return 'JSXGraph';
    case 'sketchpad':
    case 'gsp':       return 'Sketchpad';
    case 'wsp':       return 'Web Sketchpad';
    case 'geogebra':  return 'GeoGebra';
    case 'cindyjs':
    case 'cindy':     return 'CindyJS';
    case 'gx':        return 'Geometry Expressions';
    default:          return null;
  }
}

const TOOL_CATEGORIES_SET = new Set([
  'HeyGeo', 'JSXGraph', 'CindyJS', 'GeoGebra', 'Sketchpad', 'Web Sketchpad', 'Geometry Expressions',
]);

/**
 * Merges the auto-assigned tool category into the categories array.
 * Strips any stale tool category first, then appends the one detected from jsonData.__type.
 */
export function mergeToolCategory(categories: string[], jsonData: unknown): string[] {
  const tool = toolCategoryFromJson(jsonData);
  const filtered = categories.filter((c) => !TOOL_CATEGORIES_SET.has(c));
  if (tool) filtered.push(tool);
  return filtered;
}
