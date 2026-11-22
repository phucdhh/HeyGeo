'use client';

import { useEffect, useState } from 'react';

export interface TocEntry {
  href: string;
  label: string;
  sub?: boolean;
}

export default function HelpToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const targets = entries
      .map((e) => document.getElementById(e.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (records) => {
        const shown = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (shown) setActive(`#${shown.target.id}`);
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: [0, 1] },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [entries]);

  return (
    <nav
      aria-label="Mục lục"
      className="sticky top-[72px] max-h-[calc(100vh-96px)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">Mục lục</h2>
      <ul className="space-y-0.5">
        {entries.map((e) => (
          <li key={e.href}>
            <a
              href={e.href}
              className={`block rounded-md px-2 py-1 text-[13.5px] leading-snug transition-colors ${
                active === e.href
                  ? 'bg-brand-50 font-semibold text-brand-700'
                  : e.sub
                    ? 'pl-5 text-[12.5px] text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {e.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
