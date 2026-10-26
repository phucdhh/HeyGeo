'use client';

import Link from 'next/link';
import { useTranslation, Trans } from 'react-i18next';
import '@/lib/i18n';
import PublicModelCard from '@/components/PublicModelCard';
import SearchBar from '@/components/SearchBar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserAvatar from '@/components/UserAvatar';

import type { JsonValue } from '@prisma/client/runtime/library';

interface Model {
  id: string;
  title: string;
  description?: string | null;
  shareToken: string | null;
  viewCount: number;
  thumbnailSvg?: string | null;
  createdAt: Date;
  jsonData: JsonValue;
  user: { name?: string | null; email: string; avatar?: string | null; username?: string | null };
}

interface Props {
  newestModels: Model[];
  popularModels: Model[];
  user: { email: string; name: string | null; avatar: string | null } | null;
}

export default function LandingContent({ newestModels, popularModels, user }: Props) {
  const { t } = useTranslation();

  const features = [
    { icon: '📐', title: t('features.viz_title'), desc: t('features.viz_desc') },
    { icon: '🔗', title: t('features.share_title'), desc: t('features.share_desc') },
    { icon: '🖥️', title: t('features.integrate_title'), desc: t('features.integrate_desc') },
    { icon: '👤', title: t('features.manage_title'), desc: t('features.manage_desc') },
    { icon: '🔐', title: t('features.security_title'), desc: t('features.security_desc') },
    { icon: '📊', title: t('features.stats_title'), desc: t('features.stats_desc') },
  ];

  const steps = [
    { title: t('steps.step1_title'), desc: t('steps.step1_desc') },
    {
      title: t('steps.step2_title'),
      desc: (
        <Trans
          i18nKey="steps.step2_desc"
          components={{
            webCoding: (
              <a
                href="https://heygeo.pedu.vn/coding"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline font-medium"
              />
            ),
            webDesign: (
              <a
                href="https://heygeo.pedu.vn/design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline font-medium"
              />
            ),
          }}
        />
      ),
    },
    { title: t('steps.step3_title'), desc: t('steps.step3_desc') },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <img src="/logo.svg" alt="HeyGeo logo" className="w-16 h-16 flex-shrink-0" />
            <span>Hey<span className="text-amber-300">Geo</span></span>
          </Link>
          <nav className="flex items-center gap-4">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-amber-200 hover:text-white transition-colors">
                  {t('nav.dashboard')}
                </Link>
                <UserAvatar user={user} />
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-amber-200 hover:text-white transition-colors">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-amber-500 text-white py-28 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            {t('landing.hero_title')}<br />
            <span className="text-amber-200">{t('landing.hero_title_highlight')}</span>
          </h1>
          <p className="text-xl text-amber-100 mb-10 max-w-2xl mx-auto">
            {t('landing.hero_desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/dashboard" className="btn-primary !py-3 !px-8 text-base">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary !py-3 !px-8 text-base">
                  {t('landing.hero_cta_register')}
                </Link>
                <Link href="/login" className="btn-secondary !py-3 !px-8 text-base !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">
                  {t('landing.hero_cta_login')}
                </Link>
              </>
            )}
          </div>
          <div className="mt-6 flex justify-center items-center gap-3">
            <SearchBar />
            <LanguageSwitcher />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-14 text-amber-700">
            {t('landing.features_title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl leading-none">{f.icon}</span>
                  <h3 className="text-base font-semibold text-amber-600">{f.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newest Models */}
      {newestModels.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-14">
              <div>
                <h2 className="text-3xl font-bold text-amber-700">{t('landing.newest_title')}</h2>
                <p className="mt-2 text-gray-500 text-sm">{t('landing.newest_desc')}</p>
              </div>
              <Link href="/register" className="text-sm text-brand-600 hover:text-brand-700 font-medium hidden sm:block">
                {t('landing.newest_link')}
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {newestModels.map((m) => (
                <PublicModelCard
                  key={m.id}
                  title={m.title}
                  description={m.description}
                  shareToken={m.shareToken!}
                  viewCount={m.viewCount}
                  createdAt={m.createdAt}
                  thumbnailSvg={m.thumbnailSvg}
                  authorName={m.user.name ?? m.user.email}
                  authorAvatar={m.user.avatar}
                  authorSlug={m.user.username}
                  modelType={(m.jsonData as Record<string, unknown> | null)?.__type as string | undefined}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Models */}
      {popularModels.length > 0 && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-14">
              <div>
                <h2 className="text-3xl font-bold text-amber-700">{t('landing.popular_title')}</h2>
                <p className="mt-2 text-gray-500 text-sm">{t('landing.popular_desc')}</p>
              </div>
              <Link href="/register" className="text-sm text-brand-600 hover:text-brand-700 font-medium hidden sm:block">
                {t('landing.popular_link')}
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {popularModels.map((m) => (
                <PublicModelCard
                  key={m.id}
                  title={m.title}
                  description={m.description}
                  shareToken={m.shareToken!}
                  viewCount={m.viewCount}
                  createdAt={m.createdAt}
                  thumbnailSvg={m.thumbnailSvg}
                  authorName={m.user.name ?? m.user.email}
                  authorAvatar={m.user.avatar}
                  authorSlug={m.user.username}
                  modelType={(m.jsonData as Record<string, unknown> | null)?.__type as string | undefined}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery CTA */}
      <section className="py-12 px-6 bg-amber-50 text-center">
        <p className="text-gray-600 text-sm mb-5">
          {t('landing.gallery_cta_desc')}
        </p>
        <Link
          href="/gallery"
          prefetch={false}
          className="inline-flex items-center gap-2.5 bg-brand-700 text-white font-semibold px-9 py-4 rounded-xl text-base hover:bg-brand-900 transition-colors shadow-md"
        >
          {t('landing.gallery_cta_btn')}
        </Link>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-14 text-amber-700">
            {t('landing.howto_title')}
          </h2>
          <ol className="space-y-8">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-6 items-start">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-amber-600 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-600">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">{t('landing.cta_title')}</h2>
        <p className="text-amber-100 mb-8">
          {t('landing.cta_desc')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg bg-white text-brand-700 font-semibold px-8 py-3 text-base hover:bg-amber-50 transition-colors">
            {t('landing.cta_btn_register')}
          </Link>
          <Link href="/release" className="inline-flex items-center justify-center rounded-lg border-2 border-white/70 text-white font-semibold px-8 py-3 text-base hover:bg-white/10 transition-colors">
            {t('landing.cta_btn_download')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-900 text-amber-200 py-8 px-6 text-center text-sm">
        <p>
          © {new Date().getFullYear()} HeyGeo · {t('landing.footer_credit')}{' '}
          <a href="https://www.ganjingworld.com/@ndmphuc" target="_blank" rel="noopener noreferrer" className="underline">
            Nguyễn Đăng Minh Phúc
          </a>
        </p>
      </footer>
    </div>
  );
}
