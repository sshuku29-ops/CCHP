"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { canEdit: boolean; editing: boolean; setEditing: (v: boolean) => void };
const CmsContext = createContext<Ctx>({ canEdit: false, editing: false, setEditing: () => {} });

/** Wraps the public layout. Holds the "editing mode" switch for admins. */
export function CmsProvider({ canEdit, children }: { canEdit: boolean; children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <CmsContext.Provider value={{ canEdit, editing, setEditing }}>{children}</CmsContext.Provider>;
}

export function useCms() {
  return useContext(CmsContext);
}
