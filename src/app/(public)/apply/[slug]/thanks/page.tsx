import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Application received" };

/** Shown after a successful submission. Intentionally shows no applicant data. */
export default function ApplyThanksPage() {
  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Thank you — we have your application.</h1>
        <p className="text-muted-foreground">Here is what happens next:</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>The CCHP leadership team reads every application. Written answers are scored anonymously first.</li>
          <li>We may invite you to a short conversation so we can get to know each other.</li>
          <li>We will follow up by email either way. Please keep an eye on your inbox (and spam folder).</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          No account has been created for you — there is nothing to log in to. If you are accepted, the team will set up
          your access and send you the details.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline">
            <Link href="/">Back to the CCHP website</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
