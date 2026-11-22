'use client';

interface Props {
  /** Full HTML content of a Geometry Expressions export, or of a hand-written model page */
  htmlContent: string;
  /** Accessible name for the iframe; describes which tool authored the page */
  label?: string;
}

/**
 * GeometryExpressionsViewer – renders a self-contained HTML model page in a
 * sandboxed iframe using the srcdoc attribute.  Used both for Geometry
 * Expressions exports (__type 'gx') and for arbitrary authored HTML (__type
 * 'html'), since both are just a page the platform does not interpret.
 *
 * The GE runtime uses eval() to evaluate input expressions, so allow-scripts
 * is required. allow-same-origin is intentionally omitted to prevent the
 * sandboxed page from accessing the host page's cookies or storage.
 */
export default function GeometryExpressionsViewer({ htmlContent, label = 'Geometry Expressions Viewer' }: Props) {
  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-full border-0 rounded-xl bg-white"
      style={{ minHeight: 400 }}
      title={label}
      sandbox="allow-scripts"
    />
  );
}
