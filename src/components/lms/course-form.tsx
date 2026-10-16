"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCourse, updateCourse } from "@/lib/lms/actions";
import { Field } from "./field";

type CourseLike = { id: string; title: string; description: string | null; isPublished: boolean };

/** Create a course (no `course` prop) or edit an existing one. Admins only (checked server-side). */
export function CourseForm({ course }: { course?: CourseLike }) {
  const editing = !!course;
  return (
    <ActionForm action={editing ? updateCourse : createCourse} className="space-y-4">
      {(state) => (
        <>
          {course ? <input type="hidden" name="courseId" value={course.id} /> : null}
          <Field id="course-title" label="Title" error={state?.fieldErrors?.title}>
            <Input id="course-title" name="title" defaultValue={course?.title ?? ""} required maxLength={200} />
          </Field>
          <Field id="course-description" label="Description" error={state?.fieldErrors?.description}>
            <Textarea id="course-description" name="description" rows={3} defaultValue={course?.description ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={course?.isPublished ?? false} className="size-4 accent-primary" />
            Published (visible to volunteers)
          </label>
          <SubmitButton>{editing ? "Save course" : "Create course"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
