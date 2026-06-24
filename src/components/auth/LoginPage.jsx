import { useState } from "react";
import { BrandLogo } from "../BrandLogo.jsx";
import { signInWithEmailPassword } from "../../lib/auth.js";
import { supabaseConfigError } from "../../lib/supabaseClient.js";

export function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(supabaseConfigError);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithEmailPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    if (result.profileError) {
      setMessage(result.profileError);
    }

    onLoginSuccess(result);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__brand">
          <BrandLogo />
        </div>

        <div className="auth-card__intro">
          <p className="card-eyebrow card-eyebrow--red">Star Speaker</p>
          <h1 id="login-title">Step into your speaking system</h1>
          <p>Continue your daily voice practice, expert feedback, and confidence work.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              type="password"
              value={password}
            />
          </label>

          {message && (
            <div className="auth-message" role="alert">
              {message}
            </div>
          )}

          <button
            className="primary-button auth-submit"
            disabled={isSubmitting || Boolean(supabaseConfigError)}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-card__note">
          Public sign-up is not open yet. Star Speaker creates private student and teacher
          accounts.
        </p>
      </section>
    </main>
  );
}
