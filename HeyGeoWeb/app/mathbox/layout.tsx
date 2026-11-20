// Full-screen layout for the MathBox coding page – no top navigation.
export default function MathboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
