"use client";

import { useActionState } from "react";
import { submitApplicationAction } from "@/lib/recruitment/actions";
import { affiliationLabel, type FormResult } from "@/lib/recruitment/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shared/field-error";

type Question = { id: string; prompt: string; helpText: string | null; type: string; required: boolean };
type Cycle = { id: string; slug: string; type: string; questions: Question[] };

/**
 * Public application form. Uncontrolled inputs; when the server action
 * returns an error we feed the typed values back in as defaultValues so
 * nothing the applicant wrote is lost.
 */
export function ApplyForm({ cycle, renderedAt }: { cycle: Cycle; renderedAt: number }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(submitApplicationAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={cycle.slug} />
      <input type="hidden" name="ts" value={renderedAt} />
      {/* Honeypot: hidden from people (and screen readers); bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <Card>
        <CardContent className="space-y-6 py-6">
          <fieldset className="space-y-4">
            <legend className="font-heading text-lg font-semibold">About you</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" autoComplete="given-name" required defaultValue={v.firstName ?? ""} aria-invalid={!!err.firstName} />
                <FieldError msg={err.firstName} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" required defaultValue={v.lastName ?? ""} aria-invalid={!!err.lastName} />
                <FieldError msg={err.lastName} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email ?? ""} aria-invalid={!!err.email} />
              <p className="text-xs text-muted-foreground">We will only use this to follow up about your application.</p>
              <FieldError msg={err.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone ?? ""} aria-invalid={!!err.phone} />
              <FieldError msg={err.phone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affiliation">{affiliationLabel(cycle.type)}</Label>
              <Input
                id="affiliation"
                name="affiliation"
                required
                placeholder={cycle.type === "PARTNER" ? "e.g. Biology Department" : "e.g. Class of 2028"}
                defaultValue={v.affiliation ?? ""}
                aria-invalid={!!err.affiliation}
              />
              <FieldError msg={err.affiliation} />
            </div>
          </fieldset>

          {cycle.questions.length > 0 ? (
            <fieldset className="space-y-5">
              <legend className="font-heading text-lg font-semibold">Your answers</legend>
              {cycle.questions.map((q, i) => {
                const name = `q_${q.id}`;
                const label = (
                  <Label htmlFor={name} className="leading-snug">
                    {i + 1}. {q.prompt}{" "}
                    {q.required ? null : <span className="font-normal text-muted-foreground">(optional)</span>}
                  </Label>
                );
                return (
                  <div key={q.id} className="space-y-1.5">
                    {label}
                    {q.helpText ? <p className="text-xs text-muted-foreground">{q.helpText}</p> : null}
                    {q.type === "LONG_TEXT" ? (
                      <>
                        <Textarea id={name} name={name} rows={6} maxLength={2000} required={q.required} defaultValue={v[name] ?? ""} aria-invalid={!!err[name]} />
                        <p className="text-xs text-muted-foreground">Up to 2000 characters.</p>
                      </>
                    ) : q.type === "VIDEO_LINK" ? (
                      <>
                        <Input id={name} name={name} type="url" inputMode="url" placeholder="https://youtu.be/…" required={q.required} defaultValue={v[name] ?? ""} aria-invalid={!!err[name]} />
                        <p className="text-xs text-muted-foreground">Upload to YouTube as Unlisted and paste the link.</p>
                      </>
                    ) : (
                      <Input id={name} name={name} maxLength={300} required={q.required} defaultValue={v[name] ?? ""} aria-invalid={!!err[name]} />
                    )}
                    <FieldError msg={err[name]} />
                  </div>
                );
              })}
            </fieldset>
          ) : null}

          {state?.error ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">By submitting you agree that the CCHP team may contact you by email.</p>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Sending…" : "Submit application"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
