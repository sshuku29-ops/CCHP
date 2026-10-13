import { requireUser } from "@/lib/auth/guards";
import { ChangePasswordForm } from "./form";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return (
    <div className="max-w-md">
      <h1 className="font-heading text-2xl font-semibold">Change your password</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        {user.mustChangePassword
          ? "Your account was set up with a temporary password. Choose a new one to continue."
          : "Choose a new password. You will stay signed in here; other devices are signed out."}
      </p>
      <ChangePasswordForm />
    </div>
  );
}
