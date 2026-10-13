"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitAssignment } from "@/lib/lms/actions";
import { Field } from "./field";

/**
 * Volunteer submission form. Which inputs appear depends on the assignment's
 * submissionType. The server action receives FormData (including the File) and
 * validates everything again.
 */
export function SubmissionForm({
  assignmentId,
  submissionType,
  allowedExtensions,
  maxMb,
}: {
  assignmentId: string;
  submissionType: string;
  allowedExtensions: string[];
  maxMb: number;
}) {
  const showText = submissionType === "TEXT" || submissionType === "ANY";
  const showVideo = submissionType === "VIDEO_LINK" || submissionType === "ANY";
  const showFile = submissionType === "FILE" || submissionType === "ANY";
  const any = submissionType === "ANY";
  return (
    <ActionForm action={submitAssignment} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="assignmentId" value={assignmentId} />
          {any ? <p className="text-sm text-muted-foreground">Fill in at least one of the fields below.</p> : null}
          {showText ? (
            <Field id="sub-text" label={any ? "Text (optional)" : "Your response"} error={state?.fieldErrors?.text}>
              <Textarea id="sub-text" name="text" rows={8} required={!any} />
            </Field>
          ) : null}
          {showVideo ? (
            <Field
              id="sub-video"
              label={any ? "Video link (optional)" : "YouTube link"}
              help={
                <>
                  Upload your practice run to YouTube as <strong>Unlisted</strong>, then paste the link.
                </>
              }
              error={state?.fieldErrors?.videoUrl}
            >
              <Input id="sub-video" name="videoUrl" type="url" placeholder="https://youtu.be/…" required={!any} />
            </Field>
          ) : null}
          {showFile ? (
            <Field
              id="sub-file"
              label={any ? "File (optional)" : "File"}
              help={`Allowed: ${allowedExtensions.map((e) => "." + e).join(", ")} · max ${maxMb} MB.`}
              error={state?.fieldErrors?.file}
            >
              <Input id="sub-file" name="file" type="file" accept={allowedExtensions.map((e) => "." + e).join(",")} required={!any} />
            </Field>
          ) : null}
          <SubmitButton pendingText="Submitting…">Submit</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
