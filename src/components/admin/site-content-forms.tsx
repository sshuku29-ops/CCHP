"use client";

import { toast } from "sonner";
import {
  saveSiteSettingsAction,
  updateLeadershipProfileAction,
  savePartnerAction,
  deletePartnerAction,
  uploadPartnerLogoAction,
  removePartnerLogoAction,
  saveResourceAction,
  deleteResourceAction,
  markResourceVerifiedAction,
} from "@/lib/site-content/actions";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { ConfirmButton } from "@/components/shared/confirm-button";

/*
 * Client-side forms for the /site-content tabs. Each one wraps a server
 * action from src/lib/site-content/actions.ts and shows field errors inline.
 */

export type AdminOption = { id: string; firstName: string; lastName: string };

// ─────────────────────────── General ───────────────────────────

export function SiteSettingsForm({ values }: { values: Record<"mission" | "tagline" | "hero_note" | "contact_email" | "instagram_url", string> }) {
  return (
    <ActionForm action={saveSiteSettingsAction} className="space-y-4 max-w-2xl">
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" defaultValue={values.tagline} maxLength={200} />
              <p className="text-xs text-muted-foreground">One short line under the program name in the hero.</p>
              <FieldError msg={err.tagline} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mission">Mission statement</Label>
              <Textarea id="mission" name="mission" defaultValue={values.mission} rows={5} maxLength={2000} />
              <FieldError msg={err.mission} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hero_note">Hero note</Label>
              <Textarea id="hero_note" name="hero_note" defaultValue={values.hero_note} rows={3} maxLength={1000} />
              <p className="text-xs text-muted-foreground">A sentence or two that explains who we are, shown next to the mission.</p>
              <FieldError msg={err.hero_note} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input id="contact_email" name="contact_email" type="email" defaultValue={values.contact_email} maxLength={200} />
                <FieldError msg={err.contact_email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instagram_url">Instagram link</Label>
                <Input id="instagram_url" name="instagram_url" type="url" defaultValue={values.instagram_url} maxLength={500} placeholder="https://instagram.com/…" />
                <FieldError msg={err.instagram_url} />
              </div>
            </div>
            <SubmitButton>Save site text</SubmitButton>
          </>
        );
      }}
    </ActionForm>
  );
}

// ─────────────────────────── Leadership ───────────────────────────

export type LeaderRow = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  leadershipTitle: string | null;
  bio: string | null;
  photoUrl: string | null;
  photoKey: string | null;
  showOnPublicSite: boolean;
};

export function LeadershipProfileForm({ leader }: { leader: LeaderRow }) {
  const save = updateLeadershipProfileAction.bind(null, leader.id);
  return (
    <ActionForm action={save} className="grid gap-3 sm:grid-cols-2">
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <NativeSelect name="leadershipTitle" defaultValue={leader.leadershipTitle ?? ""}>
                <option value="">None</option>
                {LEADERSHIP_ROLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
              <FieldError msg={err.leadershipTitle} />
            </div>
            <div className="space-y-1.5">
              <Label>Photo link</Label>
              <Input name="photoUrl" type="url" defaultValue={leader.photoUrl ?? ""} placeholder="https://…/photo.jpg" maxLength={500} />
              <FieldError msg={err.photoUrl} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Short bio</Label>
              <Textarea name="bio" defaultValue={leader.bio ?? ""} rows={3} maxLength={1500} />
              <FieldError msg={err.bio} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="showOnPublicSite" defaultChecked={leader.showOnPublicSite} />
                Show on the public site
              </label>
              <SubmitButton variant="outline">Save</SubmitButton>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}

// ─────────────────────────── Partners ───────────────────────────

export type PartnerRow = { id: string; name: string; description: string | null; url: string | null; logoKey: string | null; order: number };

/**
 * Logo upload for an existing partner. Separate form from PartnerForm because
 * a file input needs its own submit (multipart) and a "Remove logo" button.
 */
export function PartnerLogoForm({ partner }: { partner: PartnerRow }) {
  const upload = uploadPartnerLogoAction.bind(null, partner.id);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex h-20 w-40 shrink-0 items-center justify-center rounded-md border bg-background p-2">
        {partner.logoKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${partner.logoKey}`} alt={`${partner.name} logo`} className="max-h-16 w-auto max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">No logo yet</span>
        )}
      </div>
      <ActionForm action={upload} className="flex-1 space-y-2" resetOnSuccess>
        {(state) => (
          <>
            <Label htmlFor={`logo-${partner.id}`}>Logo (PNG, JPG, SVG or WebP, max 2 MB)</Label>
            <Input id={`logo-${partner.id}`} name="logo" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg" required />
            <FieldError msg={state?.fieldErrors?.logo} />
            <div className="flex flex-wrap gap-2">
              <SubmitButton variant="outline" size="sm" pendingText="Uploading…">
                {partner.logoKey ? "Replace logo" : "Upload logo"}
              </SubmitButton>
              {partner.logoKey ? (
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  message={`Remove the logo for ${partner.name}?`}
                  action={async () => {
                    const res = await removePartnerLogoAction(partner.id);
                    if (res?.ok) toast.success("Logo removed.");
                    return res;
                  }}
                >
                  Remove logo
                </ConfirmButton>
              ) : null}
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}

export function PartnerForm({ partner }: { partner?: PartnerRow }) {
  const save = savePartnerAction.bind(null, partner?.id ?? null);
  return (
    <ActionForm action={save} className="grid gap-3 sm:grid-cols-[2fr_1fr]" resetOnSuccess={!partner}>
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" defaultValue={partner?.name ?? ""} required maxLength={120} />
              <FieldError msg={err.name} />
            </div>
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Input name="order" type="number" min={0} defaultValue={partner?.order ?? 0} />
              <FieldError msg={err.order} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Website</Label>
              <Input name="url" type="url" defaultValue={partner?.url ?? ""} placeholder="https://…" maxLength={500} />
              <FieldError msg={err.url} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={partner?.description ?? ""} rows={2} maxLength={600} />
              <FieldError msg={err.description} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <SubmitButton variant={partner ? "outline" : "default"}>{partner ? "Save" : "Add partner"}</SubmitButton>
              {partner ? (
                <ConfirmButton
                  variant="destructive"
                  message={`Remove ${partner.name} from the public site?`}
                  action={async () => {
                    const res = await deletePartnerAction(partner.id);
                    if (res?.ok) toast.success("Partner removed.");
                    return res;
                  }}
                >
                  Delete
                </ConfirmButton>
              ) : null}
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}

// ─────────────────────────── Resources ───────────────────────────

export type ResourceRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  url: string | null;
  phone: string | null;
  address: string | null;
  ownerId: string | null;
  lastVerifiedAt: Date | null;
  isPublished: boolean;
  order: number;
};

export function ResourceForm({ resource, admins, categories }: { resource?: ResourceRow; admins: AdminOption[]; categories: string[] }) {
  const save = saveResourceAction.bind(null, resource?.id ?? null);
  return (
    <ActionForm action={save} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!resource}>
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" defaultValue={resource?.name ?? ""} required maxLength={120} />
              <FieldError msg={err.name} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input name="category" defaultValue={resource?.category ?? ""} required maxLength={60} list="resource-categories" placeholder="e.g. Food, Mental health" />
              <datalist id="resource-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <FieldError msg={err.category} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={resource?.description ?? ""} rows={2} maxLength={600} />
              <FieldError msg={err.description} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input name="url" type="url" defaultValue={resource?.url ?? ""} placeholder="https://…" maxLength={500} />
              <FieldError msg={err.url} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" defaultValue={resource?.phone ?? ""} maxLength={40} />
              <FieldError msg={err.phone} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={resource?.address ?? ""} maxLength={200} />
              <FieldError msg={err.address} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner (admin who keeps it current)</Label>
              <NativeSelect name="ownerId" defaultValue={resource?.ownerId ?? ""}>
                <option value="">No owner</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                ))}
              </NativeSelect>
              <FieldError msg={err.ownerId} />
            </div>
            <div className="space-y-1.5">
              <Label>Last verified</Label>
              <Input name="lastVerifiedAt" type="date" defaultValue={toDateInput(resource?.lastVerifiedAt)} />
              <FieldError msg={err.lastVerifiedAt} />
            </div>
            <div className="space-y-1.5">
              <Label>Order</Label>
              <Input name="order" type="number" min={0} defaultValue={resource?.order ?? 0} />
              <FieldError msg={err.order} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="isPublished" defaultChecked={resource?.isPublished ?? true} />
                Published on the public site
              </label>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <SubmitButton variant={resource ? "outline" : "default"}>{resource ? "Save" : "Add resource"}</SubmitButton>
              {resource ? (
                <>
                  <ConfirmButton
                    variant="secondary"
                    message={`Mark "${resource.name}" as verified today?`}
                    action={async () => {
                      const res = await markResourceVerifiedAction(resource.id);
                      if (res?.ok) toast.success("Marked verified today.");
                      return res;
                    }}
                  >
                    Mark verified today
                  </ConfirmButton>
                  <ConfirmButton
                    variant="destructive"
                    message={`Delete "${resource.name}"?`}
                    action={async () => {
                      const res = await deleteResourceAction(resource.id);
                      if (res?.ok) toast.success("Resource deleted.");
                      return res;
                    }}
                  >
                    Delete
                  </ConfirmButton>
                </>
              ) : null}
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
