import { Button, Card, CardContent } from "@heroui/react";

export function SessionRedirectPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="max-w-xl border border-white/50 bg-white/90 shadow-panel">
        <CardContent className="gap-5 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin Session</p>
          <h1 className="text-3xl font-semibold text-ink">Redirecting to sign in</h1>
          <p className="text-sm leading-7 text-slate-600">
            The new admin preview keeps the same authentication behavior as the current backend. If your session is missing or expired, you should return to the frontend login flow first.
          </p>
          <Button color="primary" onPress={() => window.location.replace("/#/login")}>
            Go to frontend login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
