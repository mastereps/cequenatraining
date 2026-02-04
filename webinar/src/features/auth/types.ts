export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  ok: boolean;
  user: AuthUser;
}
