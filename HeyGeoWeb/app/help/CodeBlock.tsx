'use client';

import { useState } from 'react';

export default function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {label ?? 'code'}
        </span>
        <button
          onClick={copy}
          className="ml-auto rounded-md border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-brand-500 hover:text-brand-700"
        >
          {copied ? '✓ Đã copy' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-brand-900 px-4 py-3 text-[12.5px] leading-relaxed text-stone-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
