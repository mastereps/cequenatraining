import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyWebinarToken } from "../../features/webinars/api";
import type { VerifyResponse } from "../../features/webinars/types";

const VerifyPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!token) {
        setError("Missing verification token.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await verifyWebinarToken(token);
        if (active) setResult(response);
      } catch (verifyError) {
        const message =
          verifyError instanceof Error ? verifyError.message : "Verification failed.";
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  const confirmedLink = useMemo(() => {
    if (!result) return "/webinars";
    return `/webinars/${result.webinar_slug}/confirmed?email=${encodeURIComponent(result.email)}`;
  }, [result]);

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[720px] px-4">Verifying your email...</main>;
  }

  return (
    <main className="mx-auto mt-28 max-w-[720px] px-4 pb-20">
      {result ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-900">
          <h1 className="font-heading text-4xl uppercase">Verification successful</h1>
          <p className="mt-3">{result.message}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to={confirmedLink}
              className="rounded bg-lantern px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
            >
              Continue
            </Link>
            <Link
              to={`/webinars/${result.webinar_slug}`}
              className="rounded border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Webinar details
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="font-heading text-4xl uppercase">Verification failed</h1>
          <p className="mt-3">{error || "The token is invalid or expired."}</p>
          <div className="mt-6">
            <Link to="/webinars" className="font-semibold underline">
              Back to webinars
            </Link>
          </div>
        </section>
      )}
    </main>
  );
};

export default VerifyPage;
