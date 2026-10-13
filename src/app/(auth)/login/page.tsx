import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <main className="flex-1 grid place-items-center px-4 py-12 bg-[var(--cchp-green-soft)]">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-heading text-2xl font-semibold tracking-tight">CCHP</Link>
        <p className="text-sm text-muted-foreground mt-1 mb-6">Colby Community Health Program · team platform</p>
        <LoginForm next={next} />
        <p className="text-xs text-muted-foreground mt-6">
          Need an account? Ask a CCHP leader — accounts are created by the team, not self-registered.
        </p>
      </div>
    </main>
  );
}
