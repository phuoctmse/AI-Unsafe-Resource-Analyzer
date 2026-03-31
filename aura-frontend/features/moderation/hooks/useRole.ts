"use client";

// Temporary role system for local testing — no auth yet (Phase 6).
// When JWT/RBAC is implemented, replace localStorage read with token claim.
import { useEffect, useState } from "react";

export type AppRole = "user" | "admin";

const STORAGE_KEY = "aura:role";
const DEFAULT_ROLE: AppRole = "user";

export const useRole = () => {
  const [role, setRoleState] = useState<AppRole>(DEFAULT_ROLE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "user" || stored === "admin") setRoleState(stored);
  }, []);

  const setRole = (next: AppRole) => {
    localStorage.setItem(STORAGE_KEY, next);
    setRoleState(next);
  };

  return { role, setRole, isAdmin: role === "admin" };
};
