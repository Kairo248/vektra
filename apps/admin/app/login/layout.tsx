export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-2 py-8">
      {children}
    </div>
  );
}
