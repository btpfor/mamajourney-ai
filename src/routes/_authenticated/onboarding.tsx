import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeDueDateFromLmp, computeLmpFromDueDate } from "@/lib/pregnancy";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"lmp" | "due">("lmp");
  const [lmp, setLmp] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let lmpDate: Date;
      let dueDate: Date;
      if (mode === "lmp") {
        if (!lmp) throw new Error("Date des dernières règles requise");
        lmpDate = new Date(lmp);
        dueDate = computeDueDateFromLmp(lmpDate);
      } else {
        if (!due) throw new Error("Date prévue requise");
        dueDate = new Date(due);
        lmpDate = computeLmpFromDueDate(dueDate);
      }
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Non connecté");
      const { error } = await supabase.from("profiles").update({
        full_name: name || null,
        lmp_date: lmpDate.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        onboarded: true,
      }).eq("id", userRes.user.id);
      if (error) throw error;
      toast.success("Profil enregistré ❤️");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-3xl bg-card p-6 shadow-card">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15">
            <Heart className="h-6 w-6 fill-primary text-primary" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold">Bienvenue ✨</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quelques informations pour personnaliser votre suivi.</p>
        </div>

        <div>
          <Label htmlFor="n">Votre prénom</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Marie" />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted">
            <TabsTrigger value="lmp" className="rounded-full">Dernières règles</TabsTrigger>
            <TabsTrigger value="due" className="rounded-full">Date prévue</TabsTrigger>
          </TabsList>
          <TabsContent value="lmp" className="mt-4">
            <Label htmlFor="lmp">Date des dernières règles</Label>
            <Input id="lmp" type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
          </TabsContent>
          <TabsContent value="due" className="mt-4">
            <Label htmlFor="due">Date prévue d'accouchement</Label>
            <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </TabsContent>
        </Tabs>

        <Button type="submit" disabled={busy} className="w-full rounded-full">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continuer
        </Button>
      </form>
    </div>
  );
}
