import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — MamaCare AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Connexion Google impossible"); setBusy(false); return; }
    if (!res.redirected) navigate({ to: "/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Compte créé !");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email de réinitialisation envoyé");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white shadow-soft">
            <Heart className="h-7 w-7 fill-primary text-primary" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">MamaCare AI</h1>
          <p className="text-sm text-muted-foreground">Votre compagnon de grossesse</p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-card">
          <Tabs value={mode === "reset" ? "signin" : mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted">
              <TabsTrigger value="signin" className="rounded-full">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              {mode === "reset" ? (
                <form onSubmit={onSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
                  <div>
                    <Label htmlFor="r-email">Email</Label>
                    <Input id="r-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full rounded-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Envoyer le lien
                  </Button>
                  <button type="button" onClick={() => setMode("signin")} className="w-full text-xs text-muted-foreground hover:underline">Retour à la connexion</button>
                </form>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full rounded-full">
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Se connecter
                  </Button>
                  <button type="button" onClick={() => setMode("reset")} className="w-full text-xs text-muted-foreground hover:underline">Mot de passe oublié ?</button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Votre prénom</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="s-password">Mot de passe</Label>
                  <Input id="s-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">8 caractères minimum</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-full">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer mon compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={onGoogle} disabled={busy} className="w-full rounded-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuer avec Google
          </Button>
        </div>
      </div>
    </div>
  );
}
