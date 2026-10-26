'use client';

interface Props {
  /** Full HTML content of a Geometry Expressions exported .html file */
  htmlContent: string;
}

/**
 * GeometryExpressionsViewer – renders a self-contained Geometry Expressions
 * HTML export in a sandboxed iframe using the srcdoc attribute.
 *
 * The GE runtime uses eval() to evaluate input expressions, so allow-scripts
 * is required. allow-same-origin is intentionally omitted to prevent the
 * sandboxed page from accessing the host page's cookies or storage.
 */
export default function GeometryExpressionsViewer({ htmlContent }: Props) {
  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-full border-0 rounded-xl bg-white"
      style={{ minHeight: 400 }}
      title="Geometry Expressions Viewer"
      sandbox="allow-scripts"
    />
  );
}
