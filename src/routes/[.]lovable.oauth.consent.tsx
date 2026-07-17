import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";

type OAuthClient = {
  name?: string;
  client_name?: string;
  redirect_uri?: string;
  scope?: string;
};

type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};

// The `auth.oauth` namespace is beta on @supabase/supabase-js; declare a local
// typed wrapper so TypeScript can see the three methods we call.
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
type OAuthClientMethods = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
};
const oauthClient = (
  supabase.auth as unknown as { oauth: OAuthClientMethods }
).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId =
      new URLSearchParams(location.searchStr.replace(/^\?/, "")).get("authorization_id") ?? "";
    const { data, error } = await oauthClient.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <main className="mx-auto grid min-h-screen w-full max-w-md place-items-center px-5">
        <div className="w-full rounded-3xl border border-border bg-white p-7 shadow-card">
          <h1 className="font-display text-2xl font-extrabold text-ink">Authorization error</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {String((error as Error)?.message ?? error)}
          </p>
        </div>
      </main>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? "approve" : "deny");
    const { data, error } = approve
      ? await oauthClient.approveAuthorization(authorization_id)
      : await oauthClient.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.client_name || details?.client?.name || "an external app";
  const redirectUri = details?.client?.redirect_uri;
  const scopes =
    details?.scopes ??
    (typeof details?.scope === "string"
      ? details.scope.split(/\s+/).filter(Boolean)
      : typeof details?.client?.scope === "string"
        ? details.client.scope.split(/\s+/).filter(Boolean)
        : []);

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
      </header>
      <main className="mx-auto grid w-full max-w-md place-items-center px-5 py-10">
        <div className="w-full rounded-3xl border border-border bg-white p-7 shadow-card">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Authorize access
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            Connect {clientName} to Nexora AI Studio
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            This lets <span className="font-bold text-ink">{clientName}</span> use Nexora AI Studio tools as you while you are signed in.
          </p>

          <div className="mt-5 space-y-2 rounded-2xl border border-border bg-secondary/60 p-4 text-[13px] text-ink">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="font-bold">Nexora AI tools</div>
                <div className="text-muted-foreground">
                  Solve doubts, generate MCQ quizzes, and create study material outlines.
                </div>
              </div>
            </div>
            {scopes.length > 0 && (
              <div className="text-[12px] text-muted-foreground">
                Scopes: {scopes.join(", ")}
              </div>
            )}
            {redirectUri && (
              <div className="truncate text-[11px] text-muted-foreground">
                Redirect: {redirectUri}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] font-medium text-muted-foreground">
            This does not bypass Nexora's permissions or backend policies.
          </p>

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => decide(false)}
              disabled={!!busy}
              className="flex-1 rounded-full border border-border bg-white px-4 py-3 text-sm font-bold text-ink transition hover:border-primary/40 disabled:opacity-50"
            >
              {busy === "deny" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Cancel connection"}
            </button>
            <button
              onClick={() => decide(true)}
              disabled={!!busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-aurora px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-50"
            >
              {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin" />} Approve
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}