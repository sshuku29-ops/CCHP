import Link from "next/link";

/**
 * Minimal public frame for the application pages: a small header with a
 * link home, a centered column, and a short footer. The public site has no
 * shared layout yet, so this keeps /apply self-contained.
 */
export default function ApplyLayout({ children }: LayoutProps<"/apply">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--cchp-green-soft)]">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
            CCHP
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to the website
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:py-12">{children}</main>
      <footer className="border-t bg-background/80">
        <div className="mx-auto w-full max-w-2xl px-4 py-4 text-xs text-muted-foreground">
          Colby Community Health Program · Free health and wellness education in Waterville, Maine. Questions about
          applying? Email the CCHP team — details are on the{" "}
          <Link href="/" className="underline underline-offset-2">
            main site
          </Link>
          .
        </div>
      </footer>
    </div>
  );
}
