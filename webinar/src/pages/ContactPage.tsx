import { useMemo, useState } from "react";
import type { FormEvent } from "react";

const CONTACT_EMAIL = "mbcequena@gmail.com";

const ContactPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedMessage = useMemo(() => message.trim(), [message]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);

    if (!trimmedEmail || !trimmedMessage) {
      setError("Please enter your email and message.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Failed to send your message.");
        return;
      }

      setSubmitted(true);
      setEmail("");
      setMessage("");
    } catch (submitError) {
      console.error("Failed to submit contact form", submitError);
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-100 px-4 pb-20 pt-36 text-slate-900 dark:bg-[#020716] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(73,171,235,0.12),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(73,171,235,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl">
        <header className="text-center">
          <h1 className="font-heading text-5xl font-bold">Contact Us</h1>
          <p className="mt-8 text-2xl text-slate-600 dark:text-slate-300">
            We&apos;re here for you: Connect with us for any questions or
            concerns.
          </p>
        </header>

        <div className="mt-14 rounded-xl border border-slate-200 bg-white p-7 shadow-sm md:p-12 dark:border-white/10 dark:bg-[#030b1b]/80">
          <p className="text-2xl leading-relaxed text-slate-700 dark:text-slate-100">
            Have questions about books, webinar schedules, registration, or
            orders? Send us a message and we&apos;ll get back to you as soon as
            possible.
          </p>

          <form className="mt-12 space-y-8" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="contact-email" className="mb-2 block text-3xl">
                Your email:
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-14 w-full rounded-md border border-slate-300 bg-slate-100 px-4 text-lg outline-none ring-0 transition placeholder:text-slate-500 focus:border-slate-400 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-slate-400 dark:focus:border-white/30"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-2 block text-3xl">
                Your message:
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-52 w-full resize-y rounded-md border border-slate-300 bg-slate-100 p-4 text-lg outline-none ring-0 transition placeholder:text-slate-500 focus:border-slate-400 dark:border-white/10 dark:bg-white/10 dark:placeholder:text-slate-400 dark:focus:border-white/30"
                placeholder="Write your question here..."
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {submitted && !error && (
              <p className="text-sm text-emerald-400">
                Message sent successfully to {CONTACT_EMAIL}.
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className={`rounded-full px-11 py-4 text-xl font-semibold text-white transition ${
                sending
                  ? "cursor-not-allowed bg-slate-400"
                  : "cursor-pointer bg-gradient-to-r from-[#5f2dff] to-[#7a49ff] hover:brightness-110"
              }`}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactPage;
