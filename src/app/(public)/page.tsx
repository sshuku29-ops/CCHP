import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 grid place-items-center p-8">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-semibold">CCHP</h1>
        <p className="mt-2 text-muted-foreground">Public site coming soon.</p>
        <Link href="/login" className="mt-4 inline-block underline">Team sign in</Link>
      </div>
    </main>
  );
}
