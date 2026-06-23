import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500 focus:ring-2 ${className}`}
      {...props}
    />
  );
});
