"use client";

import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/lib/clerk/use-role";
import { dashboardRouteForRole } from "@/lib/constants/routes";
import { campusIdSchema, forgotPasswordSchema, signInSchema, signUpSchema, type SignUpValues } from "@/lib/validators";

/** Email-code verification digits; Clerk enforces correctness of the code itself. */
const VERIFICATION_CODE_LENGTH = 6;

/** Route Clerk returns the browser to after the OAuth handshake. */
const SSO_CALLBACK = "/sso-callback";

type FieldErrors = Partial<Record<string, string>>;

/** Form state keeps `acceptTerms` a plain boolean; the zod schema narrows it. */
type SignUpFormValues = Omit<SignUpValues, "acceptTerms"> & { acceptTerms: boolean };

/* ------------------------------------------------------------------ */
/* Visual shell — lifted from the Phase-2 mock auth screens.           */
/* ------------------------------------------------------------------ */

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-brand">
        <GraduationCap className="size-5" />
      </span>
      <span className="text-lg font-bold text-foreground">
        Campus<span className="text-primary">Connect</span>
      </span>
    </Link>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-5">
      <path d="M7.18 4.554a7.8 7.8 0 0 1 4.82-1.66c2.06 0 3.92.86 5.26 2.24a.55.55 0 0 1-.01.77l-1.75 1.75a.55.55 0 0 1-.76.01 4.63 4.63 0 0 0-2.74-1.42v2.35h3.86a.55.55 0 0 1 .54.65 7.85 7.85 0 0 1-1.98 3.98l1.9 1.9a.55.55 0 0 1 0 .78 9.87 9.87 0 0 1-6.32 2.32c-4.14 0-7.8-2.63-9.16-6.5a.55.55 0 0 1 .52-.73h3.06a.55.55 0 0 1 .52.37 5.3 5.3 0 0 0 1.24 1.95v-2.9H3.5a.55.55 0 0 1-.53-.7 9.9 9.9 0 0 1 4.21-5.94" />
    </svg>
  );
}

function AuthField({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onValue,
  autoComplete,
  inputMode,
  maxLength,
  children,
}: {
  label: string;
  type?: string;
  placeholder: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  onValue: (value: string) => void;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric";
  maxLength?: number;
  children?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className="auth-field">
        <Icon />
        <Input
          className="h-11 pl-10"
          type={isPw && show ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
        />
        {isPw && (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-danger">{message}</p>;
}

function CenteredSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <div className="px-5 pt-5 sm:px-8">
        <Brand />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="auth-card animate-rise w-full max-w-md">
          {children}
          {/*
            Mount point for Clerk's bot-sign-up protection (enabled by default).
            Without it Clerk cannot render its Smart CAPTCHA and falls back to
            the invisible widget with a console error; in "managed" mode the
            visible challenge renders here. Must exist before signUp.create()
            or the OAuth sso() call runs — this shared card guarantees that.
          */}
          <div id="clerk-captcha" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Where the signed-in journey continues: an explicit `?redirect_url=` return
 * path wins (set by proxy.ts when it intercepts a guarded route), otherwise
 * the user lands on the dashboard for their role.
 */
function useContinueDestination(): string {
  const params = useSearchParams();
  const role = useRole();
  const requested = params.get("redirect_url");
  // Same-origin paths only — an open redirect via `?redirect_url=//evil` is not acceptable.
  const safe = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;
  return safe ?? dashboardRouteForRole(role);
}

function clerkErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/** Maps Clerk's stable error codes to the friendly copy the mock promised. */
function describeClerkError(error: unknown, fallback: string): string {
  const code = clerkErrorCode(error);
  const message = error instanceof Error && error.message ? error.message : null;
  switch (code) {
    case "form_identifier_not_found":
      return "We couldn't find an account with those details.";
    case "form_identifier_exists":
      return "An account with this email already exists. Log in instead.";
    case "form_password_incorrect":
      return "Incorrect password. Try again or reset it below.";
    case "verification_expired":
    case "attempt_failed":
      return "That code didn't match or has expired. Request a new one.";
    default:
      return message ?? fallback;
  }
}

/**
 * Clerk v7 Future resources return `{ error }` instead of throwing for API
 * rejections. Re-throwing here lets each flow share one try/catch that maps
 * the error code to friendly copy.
 */
function unwrap(result: { error: unknown | null }) {
  if (result.error) throw result.error;
}

/**
 * Starts the Google OAuth journey through Clerk. Works identically for
 * sign-in and sign-up: Clerk detects whether the Google account is new and
 * continues the matching journey. The provider sends the browser back to
 * `/sso-callback`, whose `<AuthenticateWithRedirectCallback />` finishes the
 * handshake and continues to `redirectUrl`.
 */
function useGoogleAuth() {
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const destination = useContinueDestination();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      // Prefer the sign-up resource so brand-new Google accounts join the
      // sign-up journey; both resources expose the same `sso()` API.
      const resource = signUp ?? signIn;
      if (!resource) throw new Error("Clerk session is still loading");
      const result = await resource.sso({
        strategy: "oauth_google",
        redirectUrl: destination,
        redirectCallbackUrl: SSO_CALLBACK,
      });
      unwrap(result);
      // A successful call navigates away to Google; keep the spinner until it does.
    } catch (error) {
      console.error("Google sign-in failed:", error);
      toast.error(describeClerkError(error, "Could not start Google sign-in."));
      setBusy(false);
    }
  };

  return { start, busy };
}

function GoogleButton() {
  const { start, busy } = useGoogleAuth();
  return (
    <Button variant="outline" className="flex w-full items-center justify-start gap-3" onClick={start} disabled={busy}>
      <span className="flex size-9 items-center justify-center rounded-md bg-[rgb(220,38,38)] text-[rgb(255,255,255)]">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark />}
      </span>
      {busy ? "Redirecting to Google…" : "Sign in with Google"}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Sign in — email/password or Campus ID + password                    */
/* ------------------------------------------------------------------ */

function SignInCard() {
  const { signIn } = useSignIn();
  const { user } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const destination = useContinueDestination();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"email" | "campusId">("email");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const returnTo = params.get("redirect_url");
  const alreadySignedIn = Boolean(user);

  // Already-authenticated visitors don't need this screen.
  useEffect(() => {
    if (alreadySignedIn) router.replace(destination);
  }, [alreadySignedIn, destination, router]);

  if (!signIn) {
    return (
      <AuthCard>
        <CenteredSpinner />
      </AuthCard>
    );
  }

  const finish = async () => {
    unwrap(await signIn.finalize());
    router.replace(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : destination);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    // Campus ID sign-in resolves the account's email first, then
    // authenticates through Clerk as normal (docs/02-ARCHITECTURE.md §4).
    const identifierValue = mode === "campusId" ? identifier.trim().toUpperCase() : identifier.trim();

    if (mode === "email") {
      const parsed = signInSchema.safeParse({ email: identifierValue, password });
      if (!parsed.success) {
        const flattened = parsed.error.flatten().fieldErrors;
        setErrors({ email: flattened.email?.[0], password: flattened.password?.[0] });
        return;
      }
    } else {
      const parsed = campusIdSchema.safeParse({ campusId: identifierValue });
      if (!parsed.success) {
        setErrors({ email: parsed.error.flatten().fieldErrors.campusId?.[0] });
        return;
      }
      if (password.length < 8) {
        setErrors({ password: "Password must be at least 8 characters" });
        return;
      }
    }

    setBusy(true);
    setErrors({});

    try {
      let authIdentifier = identifierValue;
      if (mode === "campusId") {
        const lookup = await fetch("/api/campus-ids/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campusId: identifierValue }),
          cache: "no-store",
        });
        const payload = (await lookup.json().catch(() => null)) as { email?: string; error?: string } | null;
        if (!lookup.ok || !payload?.email) {
          setErrors({ email: payload?.error ?? "No account found with this Campus ID." });
          setBusy(false);
          return;
        }
        authIdentifier = payload.email;
      }

      // Identifier + password together can complete the sign-in in one step;
      // if the instance still wants an explicit factor, submit it separately.
      unwrap(await signIn.create({ identifier: authIdentifier, password }));
      if (signIn.status === "needs_first_factor") {
        unwrap(await signIn.password({ password }));
      }
      if (signIn.status !== "complete") {
        setErrors({ password: "Additional verification is required for this account." });
        setBusy(false);
        return;
      }
      await finish();
    } catch (error) {
      setErrors({ password: describeClerkError(error, "Could not sign you in. Please try again.") });
      setBusy(false);
    }
  };

  const switchMode = (next: "email" | "campusId") => {
    setMode(next);
    setErrors({});
    setIdentifier("");
  };

  return (
    <AuthCard>
      <GoogleButton />

      <Button
        variant="outline"
        className="mt-3 flex w-full items-center justify-start gap-3"
        onClick={() => switchMode(mode === "email" ? "campusId" : "email")}
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-[rgb(59,130,246)] text-[rgb(255,255,255)]">
          <UserRound className="size-5" />
        </span>
        {mode === "email" ? "Sign in with Campus ID" : "Sign in with email instead"}
      </Button>

      <div className="mt-6 border-t border-border/50 pt-4">
        <p className="text-center text-sm text-muted-foreground">— or —</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        <AuthField
          label={mode === "email" ? "Email" : "Campus ID"}
          type="text"
          placeholder={mode === "email" ? "you@campus.edu" : "NU-20240001"}
          icon={mode === "email" ? Mail : UserRound}
          value={identifier}
          onValue={(value) => setIdentifier(mode === "campusId" ? value.toUpperCase() : value)}
          autoComplete="username"
          inputMode={mode === "email" ? "email" : "text"}
        >
          <FieldError message={errors.email} />
        </AuthField>
        <AuthField
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={LockKeyhole}
          value={password}
          onValue={setPassword}
          autoComplete="current-password"
        >
          <FieldError message={errors.password} />
        </AuthField>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create account
          </Link>
        </div>

        <Button className="h-11 w-full text-base" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Signing you in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don’t have an account?{" "}
        <Link className="font-semibold text-primary hover:underline" href="/signup">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}

/* ------------------------------------------------------------------ */
/* Sign up — email code verification + Campus ID claim                 */
/* ------------------------------------------------------------------ */

type SignUpStage = "details" | "verifyCode" | "claimId";

function SignUpCard() {
  const { signUp } = useSignUp();
  const router = useRouter();
  const destination = useContinueDestination();

  const [stage, setStage] = useState<SignUpStage>("details");
  const [values, setValues] = useState<SignUpFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    campusId: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  /** Refs let the post-verification effect run exactly once. */
  const claimNeeded = useRef(false);
  const claimHandled = useRef(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  if (!signUp) {
    return (
      <AuthCard>
        <CenteredSpinner />
      </AuthCard>
    );
  }

  const set = <K extends keyof SignUpFormValues>(key: K, value: SignUpFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submitDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors({
        firstName: flattened.firstName?.[0],
        lastName: flattened.lastName?.[0],
        email: flattened.email?.[0],
        campusId: flattened.campusId?.[0],
        password: flattened.password?.[0],
        confirmPassword: flattened.confirmPassword?.[0],
        acceptTerms: flattened.acceptTerms?.[0],
      });
      return;
    }

    setBusy(true);
    setErrors({});

    try {
      // unsafeMetadata survives to the created user (the webhook reads
      // `unsafe_metadata.campusId` from it); Clerk rejects unrecognised
      // publicMetadata on the sign-up resource, so this travels here instead.
      unwrap(
        await signUp.create({
          emailAddress: parsed.data.email,
          password: parsed.data.password,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          unsafeMetadata: { campusId: parsed.data.campusId },
        }),
      );
      unwrap(await signUp.verifications.sendEmailCode());
      setStage("verifyCode");
    } catch (error) {
      setErrors({ email: describeClerkError(error, "Could not create the account. Try a different email.") });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (submittedCode?: string) => {
    if (busy) return;
    const value = (submittedCode ?? code).trim();
    if (value.length !== VERIFICATION_CODE_LENGTH) {
      setErrors({ code: `Enter all ${VERIFICATION_CODE_LENGTH} digits.` });
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      unwrap(await signUp.verifications.verifyEmailCode({ code: value }));
      if (signUp.status === "complete") {
        // Signals the post-verification effect below to claim + finalize.
        claimNeeded.current = true;
        setStage("claimId");
      }
    } catch (error) {
      setErrors({ code: describeClerkError(error, "That code didn't match. Check your email and try again.") });
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (busy) return;
    setBusy(true);
    try {
      unwrap(await signUp.verifications.sendEmailCode());
      toast.success("A new code is on its way.");
    } catch {
      toast.error("Could not resend the code. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  // Runs once verification completes: claim the Campus ID server-side, then
  // activate the session and continue to the dashboard.
  useEffect(() => {
    if (stage !== "claimId" || claimHandled.current || !claimNeeded.current || !signUp) return;
    claimHandled.current = true;

    void (async () => {
      try {
        if (values.campusId) {
          const response = await fetch("/api/campus-ids/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campusId: values.campusId }),
          });
          const payload = (await response.json().catch(() => null)) as { campusId?: string; error?: string } | null;
          if (!response.ok || !payload?.campusId) {
            toast.error(payload?.error ?? "We couldn't reserve that Campus ID. You can update it on your profile later.", {
              duration: 6000,
            });
          }
        }

        unwrap(await signUp.finalize());
        toast.success("Account created. Welcome to CampusConnect!");
      } catch (error) {
        console.error("Post-signup finalization failed:", error);
        // The account itself exists; don't trap the user on this screen.
      } finally {
        router.replace(destination);
      }
    })();
  }, [destination, router, signUp, stage, values.campusId]);

  if (stage === "claimId") {
    return (
      <AuthCard>
        <CenteredSpinner label="Setting up your account…" />
      </AuthCard>
    );
  }

  if (stage === "verifyCode") {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a {VERIFICATION_CODE_LENGTH}-digit code to <strong>{values.email}</strong>.
          </p>
        </div>

        <div className="mt-7 flex justify-center gap-2">
          {Array.from({ length: VERIFICATION_CODE_LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={(element) => {
                codeRefs.current[index] = element;
              }}
              className="size-12 rounded-lg border border-border bg-background text-center text-lg font-bold uppercase shadow-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              inputMode="numeric"
              maxLength={1}
              autoFocus={index === 0}
              value={code[index] ?? ""}
              onChange={(event) => {
                const digit = event.target.value.replace(/\D/g, "").slice(-1);
                const next = code.split("");
                next[index] = digit;
                setCode(next.join("").slice(0, VERIFICATION_CODE_LENGTH));
                if (digit && event.target.nextElementSibling instanceof HTMLInputElement) {
                  event.target.nextElementSibling.focus();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !code[index] && event.currentTarget.previousElementSibling instanceof HTMLInputElement) {
                  event.currentTarget.previousElementSibling.focus();
                }
                if (event.key === "Enter") void verify();
              }}
              onPaste={(event) => {
                event.preventDefault();
                const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
                setCode(pasted);
                if (pasted.length === VERIFICATION_CODE_LENGTH) void verify(pasted);
              }}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
        <FieldError message={errors.code} />

        <Button className="mt-6 h-11 w-full text-base" onClick={() => void verify()} disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify & create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <div className="mt-4 text-center text-sm">
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => void resendCode()} disabled={busy}>
            Resend code
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <GoogleButton />

      <div className="mt-6 border-t border-border/50 pt-4">
        <p className="text-center text-sm text-muted-foreground">— or —</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submitDetails} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField label="First name" placeholder="Maya" icon={UserRound} value={values.firstName} onValue={(value) => set("firstName", value)} autoComplete="given-name">
            <FieldError message={errors.firstName} />
          </AuthField>
          <AuthField label="Last name" placeholder="Santos" icon={UserRound} value={values.lastName} onValue={(value) => set("lastName", value)} autoComplete="family-name">
            <FieldError message={errors.lastName} />
          </AuthField>
        </div>
        <AuthField label="Email" type="email" placeholder="you@campus.edu" icon={Mail} value={values.email} onValue={(value) => set("email", value)} autoComplete="email" inputMode="email">
          <FieldError message={errors.email} />
        </AuthField>
        <AuthField label="Campus ID" placeholder="NU-20240001" icon={UserRound} value={values.campusId} onValue={(value) => set("campusId", value.toUpperCase())} autoComplete="off">
          <FieldError message={errors.campusId} />
        </AuthField>
        <AuthField label="Password" type="password" placeholder="••••••••" icon={LockKeyhole} value={values.password} onValue={(value) => set("password", value)} autoComplete="new-password">
          <FieldError message={errors.password} />
        </AuthField>
        <AuthField label="Confirm password" type="password" placeholder="••••••••" icon={LockKeyhole} value={values.confirmPassword} onValue={(value) => set("confirmPassword", value)} autoComplete="new-password">
          <FieldError message={errors.confirmPassword} />
        </AuthField>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/60 p-3">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
            checked={values.acceptTerms}
            onChange={(event) => set("acceptTerms", event.target.checked)}
          />
          <span className="text-sm text-muted-foreground">
            I agree to the campus acceptable-use policy and confirm these details are mine.
          </span>
        </label>
        <FieldError message={errors.acceptTerms} />

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <UserRound />
          </span>
          <div>
            <p className="text-sm font-semibold">Role: Student</p>
            <p className="text-xs text-muted-foreground">Personnel and admin accounts are assigned separately by the school.</p>
          </div>
        </div>

        <Button className="h-11 w-full text-base" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password — reset_password_email_code                         */
/* ------------------------------------------------------------------ */

type ForgotStage = "request" | "reset" | "done";

function ForgotPasswordCard() {
  const { signIn } = useSignIn();
  const { user } = useUser();
  const router = useRouter();
  const destination = useContinueDestination();

  const [stage, setStage] = useState<ForgotStage>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  // Signed-in users can change their password from their profile instead.
  useEffect(() => {
    if (user) router.replace(destination);
  }, [destination, router, user]);

  if (!signIn) {
    return (
      <AuthCard>
        <CenteredSpinner />
      </AuthCard>
    );
  }

  const request = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      unwrap(await signIn.create({ identifier: parsed.data.email }));
      unwrap(await signIn.resetPasswordEmailCode.sendCode());
      setStage("reset");
    } catch {
      // Identical copy whether or not the account exists, so this form can't
      // be used to discover which emails have accounts.
      setStage("done");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (code.trim().length !== VERIFICATION_CODE_LENGTH) {
      setErrors({ code: `Enter all ${VERIFICATION_CODE_LENGTH} digits from the email.` });
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      // verifyCode moves the sign-in to `needs_new_password`; submitPassword
      // completes it and finalize activates the fresh session.
      unwrap(await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }));
      unwrap(await signIn.resetPasswordEmailCode.submitPassword({ password }));
      if (signIn.status !== "complete") {
        setErrors({ password: "That password wasn't accepted. Try a different one." });
        setBusy(false);
        return;
      }
      unwrap(await signIn.finalize());
      toast.success("Password updated — you're signed in.");
      router.replace(destination);
    } catch (error) {
      setErrors({ password: describeClerkError(error, "Could not reset the password. Try again.") });
      setBusy(false);
    }
  };

  if (stage === "done") {
    return (
      <AuthCard>
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            If an account matches that address, we sent instructions to reset your password.
          </p>
          <Button className="mt-7 w-full" asChild>
            <Link href="/login">
              <ArrowLeft />
              Back to login
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (stage === "reset") {
    return (
      <AuthCard>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Enter the reset code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste the {VERIFICATION_CODE_LENGTH}-digit code from your email, then choose a new password.
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={reset} noValidate>
          <AuthField
            label="Reset code"
            placeholder="••••••"
            icon={Mail}
            value={code}
            onValue={(value) => setCode(value.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH))}
            inputMode="numeric"
            maxLength={VERIFICATION_CODE_LENGTH}
          >
            <FieldError message={errors.code} />
          </AuthField>
          <AuthField label="New password" type="password" placeholder="••••••••" icon={LockKeyhole} value={password} onValue={setPassword} autoComplete="new-password">
            <FieldError message={errors.password} />
          </AuthField>

          <Button className="h-11 w-full" type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <KeyRound />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your campus email and we’ll send reset instructions.</p>
      </div>

      <form className="mt-7 space-y-5" onSubmit={request} noValidate>
        <AuthField label="Campus email" type="email" placeholder="you@campus.edu" icon={Mail} value={email} onValue={setEmail} autoComplete="email" inputMode="email">
          <FieldError message={errors.email} />
        </AuthField>
        <Button className="h-11 w-full" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft />
        Back to login
      </Link>
    </AuthCard>
  );
}

/* ------------------------------------------------------------------ */
/* Exports — Suspense keeps `useSearchParams` prerender-safe.          */
/* ------------------------------------------------------------------ */

function AuthLoader() {
  return (
    <AuthCard>
      <CenteredSpinner />
    </AuthCard>
  );
}

export function AuthSignIn() {
  return (
    <Suspense fallback={<AuthLoader />}>
      <SignInCard />
    </Suspense>
  );
}

export function AuthSignUp() {
  return (
    <Suspense fallback={<AuthLoader />}>
      <SignUpCard />
    </Suspense>
  );
}

export function AuthForgotPassword() {
  return (
    <Suspense fallback={<AuthLoader />}>
      <ForgotPasswordCard />
    </Suspense>
  );
}
