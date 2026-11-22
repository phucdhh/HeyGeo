import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import HtmlStudio from '@/components/htmler/HtmlStudio';
import { BLANK_HTML_PAGE, htmlPageType } from '@/lib/htmlModel';

export const metadata = { title: 'HTML – HeyGeo' };

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function HtmlPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const params = await searchParams;

  // Pasting a page an assistant wrote is the other way in, so /html with no id
  // starts a blank document and saves it as a new model.
  if (!params.id) return <HtmlStudio initialHtml={BLANK_HTML_PAGE} />;

  const whereClause = payload.role === 'ADMIN'
    ? { id: params.id }
    : { id: params.id, userId: payload.userId };
  const model = await prisma.model.findUnique({
    where: whereClause,
    select: { id: true, title: true, jsonData: true, description: true, isPublic: true },
  });
  if (!model) redirect('/dashboard');

  const type = htmlPageType(model.jsonData);
  if (!type) redirect(`/design?id=${model.id}`);

  return (
    <HtmlStudio
      modelId={model.id}
      pageType={type}
      initialTitle={model.title}
      initialDescription={model.description ?? ''}
      initialIsPublic={model.isPublic}
      initialHtml={(model.jsonData as Record<string, unknown>).htmlContent as string}
    />
  );
}
