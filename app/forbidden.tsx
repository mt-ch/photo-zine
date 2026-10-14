import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Forbidden</h1>
      <p>You are not authorized to access this page.</p>
      <Link href="/" className="underline">
        Return home
      </Link>
    </main>
  );
}
