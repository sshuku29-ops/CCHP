// Session roster roles. Plain constants (no "server-only") so client
// components such as the roster form can import them too.

/** Roles a volunteer can have at a session. "presenter" is the default. */
export const SESSION_ROLES = ["presenter", "facilitator", "support"] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];
export const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  presenter: "Presenter",
  facilitator: "Facilitator",
  support: "Support",
};

/** A session should have at least this many presenters; the roster page warns below it. */
export const MIN_PRESENTERS = 5;

/** Shape of one row in the roster "Assign" picker (shared by the server query and the client form). */
export type AssignableUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  photoKey: string | null;
  assignmentsThisTerm: number;
};
