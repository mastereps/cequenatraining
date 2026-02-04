import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

type AuthMode = "login" | "register";

const LoginPage = () => {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const query = new URLSearchParams(location.search);
    const next = query.get("next");
    return next && next.startsWith("/") ? next : "/checkout";
  }, [location.search]);

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [navigate, nextPath, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "register") {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to continue.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto mt-28 max-w-[520px] px-4 pb-20">
      <h1 className="font-heading text-5xl uppercase">Account access</h1>
      <p className="mt-3 text-slate-700 dark:text-slate-200">
        Please log in or create an account before checkout.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] ${
              mode === "login"
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] ${
              mode === "register"
                ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === "register" ? (
            <div>
              <label htmlFor="auth-name" className="mb-1 block text-sm font-semibold">
                Full name
              </label>
              <input
                id="auth-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                placeholder="Your full name"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-semibold">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-semibold">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              placeholder="At least 8 characters"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-lantern px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Please wait..." : mode === "register" ? "Create account" : "Log in"}
          </button>
        </form>
      </div>

      <div className="mt-4">
        <Link to="/cart" className="text-sm font-semibold underline">
          Back to cart
        </Link>
      </div>
    </main>
  );
};

export default LoginPage;
