/**
 * Sanitize and normalize an SVG string for safe inline thumbnail rendering.
 *
 * 1. Strips <script> elements and on* event-handler attributes (security).
 * 2. If the root <svg> has explicit width/height but no viewBox, adds a viewBox
 *    from those dimensions so the SVG scales to fit its container instead of
 *    being clipped (JSXGraph emits width="600" height="500" without viewBox).
 * 3. Replaces the root width/height with "100%" so CSS controls the size.
 */
export function sanitizeSvg(svg: string): string {
  // Security: strip scripts and event handlers
  let out = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');

  // Normalise the root <svg> tag so the thumbnail scales correctly.
  // Match the opening <svg ...> tag (everything up to the first ">").
  out = out.replace(/(<svg\b[^>]*>)/, (svgTag) => {
    const hasViewBox = /\bviewBox\s*=/i.test(svgTag);

    // Extract numeric width / height from the tag (supports px, pt, mm, cm, in, etc.)
    const wMatch = svgTag.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)([a-z%]*)/i);
    const hMatch = svgTag.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)([a-z%]*)/i);
    const wVal = wMatch?.[1];
    const wUnit = wMatch?.[2]?.toLowerCase() || '';
    const hVal = hMatch?.[1];
    const hUnit = hMatch?.[2]?.toLowerCase() || '';

    let tag = svgTag;

    // Add viewBox derived from dimensions if missing (convert mm/cm/pt/in to px approximation if needed)
    if (!hasViewBox && wVal && hVal && wUnit !== '%' && hUnit !== '%') {
      const toPx = (val: number, unit: string) => {
        if (unit === 'mm') return (val * 96) / 25.4;
        if (unit === 'cm') return (val * 96) / 2.54;
        if (unit === 'in') return val * 96;
        if (unit === 'pt') return (val * 96) / 72;
        return val;
      };
      const wPx = Math.round(toPx(parseFloat(wVal), wUnit));
      const hPx = Math.round(toPx(parseFloat(hVal), hUnit));
      tag = tag.replace(/(<svg\b)/i, `$1 viewBox="0 0 ${wPx} ${hPx}"`);
    }

    // Replace width and height with "100%" (stripping any existing units like mm, cm, px, pt)
    // so CSS container controls the layout.
    tag = tag.replace(/\bwidth\s*=\s*["'][^"']*["']/i, 'width="100%"');
    tag = tag.replace(/\bheight\s*=\s*["'][^"']*["']/i, 'height="100%"');

    // Ensure preserveAspectRatio keeps the geometry centred and fully visible
    if (!/\bpreserveAspectRatio\b/i.test(tag)) {
      tag = tag.replace(/(<svg\b)/i, '$1 preserveAspectRatio="xMidYMid meet"');
    }

    return tag;
  });

  return out;
}

/**
 * Returns true if the SVG string contains no meaningful geometric/visual elements
 * (e.g. only <defs>, <style>, empty <g></g>, hidden <foreignObject>, or comments).
 */
export function isSvgVisuallyEmpty(svg: string): boolean {
  if (!svg || typeof svg !== 'string') return true;
  if (svg.startsWith('data:image/')) return false;

  const stripped = svg
    .replace(/<defs[\s\S]*?<\/defs>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<foreignObject[^>]*display\s*:\s*none[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<foreignObject[^>]*display="none"[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<g\b[^>]*>\s*<\/g>/gi, '')
    .replace(/<svg\b[^>]*>/gi, '')
    .replace(/<\/svg>/gi, '')
    .trim();

  const hasShape = /<(path|circle|line|polygon|polyline|ellipse|text|image|rect\b(?![^>]*fill=["']none["']))/i.test(stripped);
  return !hasShape;
}
