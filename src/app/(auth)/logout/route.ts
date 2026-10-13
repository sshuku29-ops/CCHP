import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";

// POST /logout — called from the sign-out form. GET also works for convenience.
export async function POST() {
  await destroySession();
  redirect("/login");
}
export async function GET() {
  await destroySession();
  redirect("/login");
}
