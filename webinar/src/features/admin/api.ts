import type { DashboardSummary } from "./types";

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await fetch("/api/admin/dashboard", { credentials: "include" });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  return (await res.json()) as DashboardSummary;
};
