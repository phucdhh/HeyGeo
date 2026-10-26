// Full-screen layout for the Design page – no top navigation, like a desktop app.
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100">
      {children}
    </div>
  );
}
