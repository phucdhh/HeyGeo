// Full-screen layout for the WSP editor page – no top navigation.
export default function WspLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
