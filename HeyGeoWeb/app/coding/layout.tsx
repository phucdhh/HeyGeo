// Full-screen layout for the Coding page – no top navigation, like a code editor.
export default function CodingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
