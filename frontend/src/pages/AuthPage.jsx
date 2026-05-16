import { useState } from "react";
import { Input } from "../components/Input";
import { classNames } from "../utils/classNames";

export function AuthPage({ error, loading, onAuthenticate }) {
  const [authMode, setAuthMode] = useState("signin");
  const [signinForm, setSigninForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [localError, setLocalError] = useState("");

  const handleSignin = async (event) => {
    event.preventDefault();
    setLocalError("");
    await onAuthenticate("signin", signinForm).catch(() => {});
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    await onAuthenticate("signup", {
      fullName: signupForm.fullName,
      email: signupForm.email,
      password: signupForm.password,
    }).catch(() => {});
  };

  const visibleError = localError || error;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
      <div className="auth-panel w-full max-w-xl p-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text)]">TaskStream</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--muted-text)]">Productivity Hub</p>

        <div className="mt-8 mb-5 flex rounded-lg bg-[var(--control-bg)] p-1">
          {[
            ["signin", "Sign In"],
            ["signup", "Sign Up"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setAuthMode(key)}
              className={classNames("w-1/2 rounded-md py-2 font-semibold", authMode === key ? "bg-[var(--panel)] text-[var(--text)] shadow" : "text-[var(--muted-text)]")}
            >
              {label}
            </button>
          ))}
        </div>

        {authMode === "signin" ? (
          <form className="space-y-4" onSubmit={handleSignin}>
            <Input label="Email Address" value={signinForm.email} onChange={(value) => setSigninForm((state) => ({ ...state, email: value }))} placeholder="name@company.com" />
            <Input label="Password" type="password" value={signinForm.password} onChange={(value) => setSigninForm((state) => ({ ...state, password: value }))} placeholder="********" />
            <button disabled={loading} className="primary-button w-full">{loading ? "Signing in..." : "Sign In"}</button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSignup}>
            <Input label="Full Name" value={signupForm.fullName} onChange={(value) => setSignupForm((state) => ({ ...state, fullName: value }))} placeholder="Enter your full name" />
            <Input label="Email Address" value={signupForm.email} onChange={(value) => setSignupForm((state) => ({ ...state, email: value }))} placeholder="name@company.com" />
            <Input label="Password" type="password" value={signupForm.password} onChange={(value) => setSignupForm((state) => ({ ...state, password: value }))} placeholder="********" />
            <Input label="Confirm Password" type="password" value={signupForm.confirmPassword} onChange={(value) => setSignupForm((state) => ({ ...state, confirmPassword: value }))} placeholder="********" />
            <button disabled={loading} className="primary-button w-full">{loading ? "Creating account..." : "Create Account"}</button>
          </form>
        )}

        {visibleError ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{visibleError}</p> : null}
      </div>
    </div>
  );
}
