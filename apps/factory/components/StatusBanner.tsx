type Variant = "info" | "success" | "error";

const styles: Record<Variant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function StatusBanner({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
