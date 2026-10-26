// Full-screen layout for the GeoGebra editor page – no top navigation.
export default function GeoGebraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
