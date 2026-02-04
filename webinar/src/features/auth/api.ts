import type { AuthResponse } from "./types";

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

export const registerAuthUser = async (
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  return (await res.json()) as AuthResponse;
};

export const loginAuthUser = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  return (await res.json()) as AuthResponse;
};
