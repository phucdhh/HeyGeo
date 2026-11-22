import type { ReactNode } from 'react';

/** Presentational primitives for /help — the HeyShow Help look in HeyGeo's Tailwind. */

export function Section({
  num,
  id,
  title,
  lead,
  children,
}: {
  num: string;
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-6 scroll-mt-20 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <h2 className="mb-1.5 flex items-center gap-2.5 text-[1.4rem] font-bold leading-tight text-gray-900">
        <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-[15px] font-extrabold text-brand-900">
          {num}
        </span>
        {title}
      </h2>
      {lead && <p className="mb-4 text-[15px] leading-relaxed text-gray-500">{lead}</p>}
      <div className="help-body">{children}</div>
    </section>
  );
}

export function Sub({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="mt-6 scroll-mt-20">
      <h3 className="mb-1.5 text-[1.05rem] font-bold text-brand-700">{title}</h3>
      <div className="help-body">{children}</div>
    </div>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 leading-relaxed text-gray-700">{children}</p>;
}

export function List({ items, ordered }: { items: ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`mb-3 space-y-1.5 pl-5 leading-relaxed text-gray-700 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </Tag>
  );
}

export function Callout({ children, tone = 'tip' }: { children: ReactNode; tone?: 'tip' | 'warn' | 'info' }) {
  const skin = {
    tip:   'border-amber-200 bg-brand-50 text-amber-900',
    warn:  'border-red-200 bg-red-50 text-red-800',
    info:  'border-gray-200 bg-gray-50 text-gray-700',
  }[tone];
  return <div className={`my-3 rounded-lg border px-4 py-3 text-sm leading-relaxed ${skin}`}>{children}</div>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[0.85em] text-brand-700">
      {children}
    </code>
  );
}

export function K({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-gray-900">{children}</strong>;
}

export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border border-gray-200 bg-gray-50 px-2.5 py-2 text-left align-top font-bold text-gray-800"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50/60' : ''}>
              {r.map((c, j) => (
                <td key={j} className="border border-gray-200 px-2.5 py-2 align-top leading-relaxed text-gray-700">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      className="font-medium text-brand-600 underline-offset-2 hover:underline"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
