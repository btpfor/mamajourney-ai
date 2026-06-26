import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Smile, Frown, Meh, Heart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MOODS = [
  { value: "great", label: "Super", icon: Smile, color: "bg-mint" },
  { value: "ok", label: "Ça va", icon: Meh, color: "bg-sky" },
  { value: "tired", label: "Fatiguée", icon: Frown, color: "bg-blush" },
  { value: "love", label: "Heureuse", icon: Heart, color: "bg-lavender" },
];

const SYMPTOMS = ["Nausées", "Vomissements", "Fatigue", "Maux de tête", "Contractions", "Douleurs lombaires", "Brûlures d'estomac", "Insomnie"];

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Journal — MamaCare AI" }] }),
  component: JournalPage,
});

function JournalPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<string>("ok");
  const [weight, setWeight] = useState("");
  const [bp, setBp] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const entries = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const symptoms = useQuery({
    queryKey: ["symptoms"],
    queryFn: async () => {
      const { data } = await supabase.from("symptoms").select("*").order("entry_date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("journal_entries").insert({
        user_id: u.user.id, entry_date: today,
        mood, weight_kg: weight ? Number(weight) : null,
        blood_pressure: bp || null, notes: notes || null,
      });
      if (error) throw error;
      if (selectedSymptoms.length) {
        await supabase.from("symptoms").insert(
          selectedSymptoms.map((s) => ({ user_id: u.user!.id, entry_date: today, symptom: s, intensity: 2 }))
        );
      }
    },
    onSuccess: () => {
      toast.success("Entrée ajoutée");
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["symptoms"] });
      setOpen(false); setNotes(""); setWeight(""); setBp(""); setSelectedSymptoms([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground">Votre humeur, poids et symptômes au jour le jour.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouvelle entrée</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Humeur du jour</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-xs transition ${
                        mood === m.value ? `${m.color} ring-2 ring-primary` : "bg-muted"
                      }`}
                    >
                      <m.icon className="h-5 w-5" /> {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="w">Poids (kg)</Label>
                  <Input id="w" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bp">Tension</Label>
                  <Input id="bp" placeholder="12/8" value={bp} onChange={(e) => setBp(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Symptômes</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SYMPTOMS.map((s) => {
                    const active = selectedSymptoms.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSymptoms((p) => active ? p.filter((x) => x !== s) : [...p, s])}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label htmlFor="n">Notes</Label>
                <Textarea id="n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comment je me sens aujourd'hui..." />
              </div>
              <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full rounded-full">
                {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-6 space-y-3">
        {entries.isLoading && <div className="h-24 animate-pulse rounded-3xl bg-muted" />}
        {entries.data && entries.data.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">Aucune entrée pour le moment. Commencez aujourd'hui ❤️</p>
          </div>
        )}
        {entries.data?.map((e: any) => {
          const m = MOODS.find((x) => x.value === e.mood);
          const daySymptoms = symptoms.data?.filter((s: any) => s.entry_date === e.entry_date) ?? [];
          return (
            <article key={e.id} className="rounded-3xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-semibold">
                  {format(new Date(e.entry_date), "EEEE d MMMM", { locale: fr })}
                </p>
                {m && <span className={`rounded-full ${m.color} px-3 py-1 text-xs font-semibold`}>{m.label}</span>}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                {e.weight_kg && <span>⚖️ {e.weight_kg} kg</span>}
                {e.blood_pressure && <span>🩺 {e.blood_pressure}</span>}
              </div>
              {daySymptoms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {daySymptoms.map((s: any) => (
                    <span key={s.id} className="rounded-full bg-blush/60 px-2 py-0.5 text-[10px] font-medium">{s.symptom}</span>
                  ))}
                </div>
              )}
              {e.notes && <p className="mt-2 text-sm text-foreground/80">{e.notes}</p>}
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
