'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Props {
  defaultSearch: string;
  defaultRole: string;
}

export default function UserSearchForm({ defaultSearch, defaultRole }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(defaultSearch);
  const [role, setRole]     = useState(defaultRole);
  const [, startTransition] = useTransition();

  function apply(e?: React.FormEvent) {
    e?.preventDefault();
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (role) p.set('role', role);
    p.set('page', '1');
    startTransition(() => router.push(`/admin/users?${p.toString()}`));
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-48">
        <label className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email hoặc tên..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Vai trò</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        >
          <option value="">Tất cả</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
      >
        Tìm kiếm
      </button>
      {(defaultSearch || defaultRole) && (
        <button
          type="button"
          onClick={() => { setSearch(''); setRole(''); startTransition(() => router.push('/admin/users')); }}
          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Xóa bộ lọc
        </button>
      )}
    </form>
  );
}
