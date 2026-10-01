import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

const passwordResetEmail = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY ?? "",
  from: process.env.AUTH_EMAIL_FROM ?? "",
  async generateVerificationToken() {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return String(random[0] % 1_000_000).padStart(6, "0");
  },
  async sendVerificationRequest({ identifier, token, provider }) {
    if (!provider.apiKey || !provider.from) throw new ConvexError("Password recovery email is not configured for this deployment.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: provider.from,
        to: [identifier],
        subject: "Your MEDICO password reset code",
        text: `Your MEDICO password reset code is ${token}. It expires shortly. If you did not request this, ignore this email.`,
      }),
    });
    if (!response.ok) throw new ConvexError("We could not send the password reset email. Try again later.");
  },
});

const passwordProvider = Password<DataModel>({
  reset: passwordResetEmail,
  profile(params) {
    const email = String(params.email ?? "").trim().toLowerCase();
    const name = String(params.name ?? "").trim();
    const phone = String(params.phone ?? "").replace(/\s+/g, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
    if (name.length < 2 || name.length > 100) throw new ConvexError("Enter your full name.");
    if (!/^[6-9]\d{9}$/.test(phone)) throw new ConvexError("Enter a valid 10-digit Indian mobile number.");
    return { email, name, phone, role: "customer" as const };
  },
  validatePasswordRequirements(password) {
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new ConvexError("Use at least 10 characters, including a letter and a number.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [passwordProvider] });