import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import JSXGraphViewer from '@/components/JSXGraphViewer';
import WSPViewer from '@/components/WSPViewer';
import GeoGebraViewer from '@/components/GeoGebraViewer';
import GeometryExpressionsViewer from '@/components/GeometryExpressionsViewer';
import CindyJSViewer from '@/components/CindyJSViewer';
import LatexRenderer from '@/components/LatexRenderer';
import CommentsSection from '@/components/CommentsSection';
import ModelReactionsBar from '@/components/ModelReactionsBar';
import ResizableShareLayout from '@/components/ResizableShareLayout';

function ModelViewer({ data, id }: { data: unknown; id?: string }) {
  const rec = data as Record<string, unknown>;
  if (rec.__type === 'sketchpad' || rec.__type === 'wsp') {
    return <WSPViewer data={(rec.data as object) ?? {}} />;
  }
  if (rec.__type === 'geogebra') {
    return <GeoGebraViewer base64={rec.base64 as string} is3d={rec.is3d as boolean | undefined} />;
  }
  if (rec.__type === 'gx') {
    return <GeometryExpressionsViewer htmlContent={rec.htmlContent as string} />;
  }
  if (rec.__type === 'cindy') {
    return <CindyJSViewer code={rec.code as string} idSuffix="share" />;
  }
  return (
    <JSXGraphViewer
      data={data as Parameters<typeof JSXGraphViewer>[0]['data']}
      containerId={id ?? 'share-board'}
    />
  );
}

// Resolve the underlying rendering engine so the "Được tạo bằng HeyGeo & …"
// footer credits the correct tool (JSXGraph, Sketchpad, Web Sketchpad,
// GeoGebra, CindyJS, Geometry Expressions) instead of always JSXGraph.
function toolCredit(data: unknown): { label: string; url: string } {
  const rec = data as Record<string, unknown>;
  switch (rec.__type) {
    case 'sketchpad':
    case 'gsp':
      return { label: 'Sketchpad', url: 'https://gsptest.scratchconsortium.com/' };
    case 'wsp':
      return { label: 'Web Sketchpad', url: 'https://geometricfunctions.org' };
    case 'geogebra':
      return { label: 'GeoGebra', url: 'https://www.geogebra.org' };
    case 'gx':
      return { label: 'Geometry Expressions', url: 'https://www.geometryexpressions.com' };
    case 'cindy':
    case 'cindyjs':
      return { label: 'CindyJS', url: 'https://cindyjs.org' };
    default:
      return { label: 'JSXGraph', url: 'https://jsxgraph.uni-bayreuth.de' };
  }
}

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const model = await prisma.model.findUnique({
    where: { shareToken: token, isPublic: true },
    select: { title: true, description: true },
  });
  if (!model) return { title: 'Không tìm thấy' };
  return { title: model.title, description: model.description ?? undefined };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  const model = await prisma.model.findUnique({
    where: { shareToken: token, isPublic: true },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!model) notFound();

  // Increment view count (fire-and-forget).
  // Use raw SQL instead of prisma.model.update() so that the @updatedAt
  // field is NOT bumped just because someone viewed a public model —
  // otherwise old models would keep jumping to the top of the dashboard
  // as if they had just been edited.
  prisma.$executeRaw`UPDATE "Model" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${model.id}`.catch(() => {});

  // Resolve the currently logged-in user (optional — for comment auth)
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  let currentUser: { id: string; name: string | null; email: string } | null = null;
  if (authToken) {
    const payload = await verifyToken(authToken);
    if (payload) {
      const userRecord = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true },
      });
      currentUser = userRecord;
    }
  }

  const isModelOwner = currentUser != null && model.userId === currentUser.id;

  const authorName = model.user.name ?? model.user.email;
  const credit = toolCredit(model.jsonData);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen lg:h-screen lg:overflow-hidden">
      {/* Header */}
      <header className="bg-brand-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <a href="https://heygeo.pedu.vn" className="text-xl font-bold">
          Hey<span className="text-amber-300">Geo</span>
        </a>
        <a href="https://heygeo.pedu.vn/register" className="text-sm text-indigo-200 hover:text-white">
          Tạo tài khoản miễn phí →
        </a>
      </header>

      {/* Content — ResizableShareLayout enables drag-to-resize on mobile */}
      <ResizableShareLayout
        viewer={<ModelViewer data={model.jsonData} id="share-board" />}
        aside={
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{model.title}</h1>
            <p className="text-xs text-gray-400 mb-4">
              bởi <span className="text-gray-600 font-medium">{authorName}</span>
              &nbsp;·&nbsp;{model.viewCount} lượt xem
            </p>

            {model.description && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">Mô tả</h2>
                <div className="text-sm text-gray-700">
                  <LatexRenderer>{model.description}</LatexRenderer>
                </div>
              </div>
            )}

            {model.guide && (
              <div>
                <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                  📋 Hướng dẫn khảo sát
                </h2>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <LatexRenderer>{model.guide}</LatexRenderer>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
              Được tạo bằng{' '}
              <a href="https://heygeo.pedu.vn" className="underline">
                HeyGeo
              </a>{' '}
              &amp;{' '}
              <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline">
                {credit.label}
              </a>
            </div>

            <ModelReactionsBar modelId={model.id} isLoggedIn={currentUser !== null} />

            <CommentsSection modelId={model.id} currentUser={currentUser} isModelOwner={isModelOwner} />
          </>
        }
      />
    </div>
  );
}
