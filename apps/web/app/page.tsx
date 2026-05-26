import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Welcome to Vektra
      </h1>
      <p className="max-w-xl text-zinc-600">
        Complete tasks, earn Vektras. Create an account to get started, then
        explore tasks and your wallet.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-800"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Sign up
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
