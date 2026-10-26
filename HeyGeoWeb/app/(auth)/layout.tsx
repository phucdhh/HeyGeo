import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-900 via-brand-700 to-indigo-500">
      <header className="px-6 py-5">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight">
          Hey<span className="text-amber-300">Geo</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
      <footer className="text-center text-indigo-200 text-xs py-4 px-6">
        © {new Date().getFullYear()} HeyGeo
      </footer>
    </div>
  );
}
