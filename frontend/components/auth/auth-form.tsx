"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useConvexReady } from "@/components/providers/convex-provider";

type AuthFormProps = {
  mode: "signIn" | "signUp";
  callbackUrl: string;
};

export default function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const ready = useConvexReady();
  return ready ? <ConnectedAuthForm mode={mode} callbackUrl={callbackUrl} /> : <DisconnectedAuthForm mode={mode} />;
}

function DisconnectedAuthForm({ mode }: { mode: "signIn" | "signUp" }) {
  return (
    <section className="auth-card">
      <h1>{mode === "signUp" ? "Create your MEDICO account" : "Welcome back"}</h1>
      <p className="auth-card__description">{mode === "signUp" ? "A few details to get your account started." : "Sign in to access your account and orders."}</p>
      <div className="service-notice" role="status"><ShieldCheck size={19} /><span>Account services are not connected yet. Configure <code>NEXT_PUBLIC_CONVEX_URL</code> and the Convex Auth deployment settings to enable sign in.</span></div>
      <form className="auth-form" aria-label={mode === "signUp" ? "Sign-up form" : "Sign-in form"}>
        {mode === "signUp" && <><label>Full name<input autoComplete="name" disabled placeholder="Your full name" /></label><label>Mobile number<input autoComplete="tel" disabled inputMode="numeric" placeholder="10-digit mobile number" /></label></>}
        <label>Email address<input autoComplete="email" disabled placeholder="you@example.com" type="email" /></label>
        <label>Password<input autoComplete={mode === "signUp" ? "new-password" : "current-password"} disabled placeholder={mode === "signUp" ? "At least 10 characters" : "Your password"} type="password" /></label>
        {mode === "signUp" && <label>Confirm password<input autoComplete="new-password" disabled placeholder="Enter your password again" type="password" /></label>}
        <button className="button button--primary" disabled type="button">{mode === "signUp" ? "Create account" : "Sign in"}</button>
      </form>
      <p className="auth-switch">{mode === "signUp" ? "Already registered? " : "New to MEDICO? "}<Link href={mode === "signUp" ? "/auth/signin" : "/auth/signup"}>{mode === "signUp" ? "Sign in" : "Create an account"}</Link></p>
    </section>
  );
}

function ConnectedAuthForm({ mode, callbackUrl }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetStep, setResetStep] = useState<"none" | "request" | "verify">("none");
  const [resetEmail, setResetEmail] = useState("");
  const isSignUp = mode === "signUp";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    if (isSignUp && formData.get("password") !== formData.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await signIn("password", formData);
      router.replace(callbackUrl);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't sign you in. Check your details and try again.");
    } finally {
      setPending(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    formData.set("flow", "reset");
    try {
      await signIn("password", formData);
      setResetEmail(email);
      setResetStep("verify");
      setMessage("If an account exists for that email, a reset code has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send a reset code. Check your email and try again.");
    } finally {
      setPending(false);
    }
  }

  async function verifyPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    formData.set("flow", "reset-verification");
    formData.set("email", resetEmail);
    try {
      await signIn("password", formData);
      setResetStep("none");
      setMessage("Password updated. Sign in with your new password.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The reset code could not be verified.");
    } finally {
      setPending(false);
    }
  }

  if (resetStep !== "none") {
    return (
      <section className="auth-card">
        <p className="eyebrow"><span className="eyebrow__dot" /> Account recovery</p>
        <h1>{resetStep === "request" ? "Reset your password" : "Enter your reset code"}</h1>
        <p className="auth-card__description">{resetStep === "request" ? "We'll send a short-lived code to your account email." : `Enter the code sent to ${resetEmail} and choose a new password.`}</p>
        {resetStep === "request" ? (
          <form className="auth-form" onSubmit={(event) => void requestPasswordReset(event)}>
            <label htmlFor="reset-email">Email address</label><input id="reset-email" name="email" type="email" autoComplete="email" required defaultValue={resetEmail} placeholder="you@example.com" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button--primary auth-submit" type="submit" disabled={pending}>{pending ? "Sending code..." : "Send reset code"}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(event) => void verifyPasswordReset(event)}>
            <label htmlFor="reset-code">Reset code</label><input id="reset-code" name="code" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} />
            <label htmlFor="reset-password">New password</label><input id="reset-password" name="newPassword" type="password" autoComplete="new-password" required minLength={10} placeholder="At least 10 characters" />
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="button button--primary auth-submit" type="submit" disabled={pending}>{pending ? "Updating password..." : "Update password"}</button>
          </form>
        )}
        <button className="text-button auth-reset" type="button" onClick={() => { setResetStep("none"); setError(""); setMessage(""); }}>Back to sign in</button>
      </section>
    );
  }

  return (
    <section className="auth-card">
      <p className="eyebrow"><span className="eyebrow__dot" /> Secure MEDICO account</p>
      <h1>{isSignUp ? "Create your MEDICO account" : "Welcome back"}</h1>
      <p className="auth-card__description">{isSignUp ? "A few details to get your account started." : "Sign in to access your account and orders."}</p>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <input name="flow" type="hidden" value={mode} />
        {isSignUp && <>
          <label htmlFor="auth-name">Full name</label><input id="auth-name" name="name" autoComplete="name" minLength={2} maxLength={100} placeholder="Your full name" required />
          <label htmlFor="auth-phone">Mobile number</label><input id="auth-phone" name="phone" autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit Indian mobile number" required />
        </>}
        <label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
        <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={10} required placeholder={isSignUp ? "At least 10 characters" : "Your password"} />
        {isSignUp && <><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required placeholder="Enter your password again" /></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button button--primary auth-submit" type="submit" disabled={pending}>
          {pending && <LoaderCircle size={17} className="spin" />}{pending ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
      {!isSignUp && <button className="text-button auth-reset" type="button" onClick={() => { setResetStep("request"); setError(""); setMessage(""); }}>Forgot password?</button>}
      <p className="auth-switch">{isSignUp ? "Already registered? " : "New to MEDICO? "}<Link href={isSignUp ? "/auth/signin" : "/auth/signup"}>{isSignUp ? "Sign in" : "Create an account"}</Link></p>
      <p className="auth-security"><ShieldCheck size={15} /> Passwords are handled by Convex Auth and are never stored by the storefront.</p>
    </section>
  );
}