import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table
        className={`w-full min-w-[640px] text-left text-sm ${className}`}
        {...props}
      />
    </div>
  );
}

export function Th({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-600 ${className}`}
      {...props}
    />
  );
}

export function Td({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`border-b border-zinc-100 px-3 py-2.5 text-zinc-800 ${className}`}
      {...props}
    />
  );
}
