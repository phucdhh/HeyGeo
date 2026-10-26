export const metadata = { title: 'Web Sketchpad – HeyGeo' };

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function WspPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const src = id ? `/wsp-tool/index.html?id=${encodeURIComponent(id)}` : '/wsp-tool/index.html';
  return (
    <iframe
      src={src}
      className="w-full h-full border-0"
      title="Web Sketchpad Editor"
      allow="fullscreen"
    />
  );
}
