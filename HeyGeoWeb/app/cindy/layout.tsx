// Full-screen layout for the CindyJS coding page – no top navigation.
export default function CindyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
