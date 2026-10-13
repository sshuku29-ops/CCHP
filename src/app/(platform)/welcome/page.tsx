import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { skipPhotoPromptAction } from "@/lib/account/actions";
import { PageHeader } from "@/components/shared/page-header";
import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoForm } from "../account/photo-form";

export const metadata = { title: "Welcome" };

/**
 * First-login prompt. The platform layout sends people here once when they
 * have no photo and have never seen this page. Uploading, "Skip for now" and
 * "Don't ask again" all stamp photoPromptSeenAt, so it is shown once per account.
 */
export default async function WelcomePage() {
  const user = await requireUser();
  // Already answered (or already has a photo): nothing to ask.
  if (user.photoKey || user.photoPromptSeenAt) redirect("/dashboard");

  async function skipAndGo() {
    "use server";
    await skipPhotoPromptAction();
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`Welcome, ${user.firstName}!`} description="One quick thing before you get started." />
      <Card>
        <CardHeader>
          <CardTitle>Add a photo so your team recognizes you</CardTitle>
          <CardDescription>
            Your photo appears next to your name on tasks, sessions and the volunteer directory. You can change or remove it any time from{" "}
            <Link href="/account" className="underline underline-offset-4">My account</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* data-allow-mobile: admins on phones can still answer this one-time prompt. */}
          <div data-allow-mobile>
            <PhotoForm user={{ firstName: user.firstName, lastName: user.lastName, photoKey: user.photoKey }} compact />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <form action={skipAndGo} data-allow-mobile>
              <SubmitButton variant="outline" size="sm" pendingText="One moment…" data-allow-mobile>Skip for now</SubmitButton>
            </form>
            <form action={skipAndGo} data-allow-mobile>
              <SubmitButton variant="ghost" size="sm" pendingText="One moment…" data-allow-mobile>Don&rsquo;t ask again</SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
