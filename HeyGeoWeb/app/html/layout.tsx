// Full-screen layout for the HTML page editor – no top navigation, like /coding.
export default function HtmlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
