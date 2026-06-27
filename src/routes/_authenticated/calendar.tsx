import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, isAfter, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, MapPin, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KINDS = [
  { v: "consultation", l: "Consultation" },
  { v: "echographie", l: "Échographie" },
  { v: "vaccin", l: "Vaccin" },
  { v: "examen", l: "Examen" },
  { v: "sage-femme", l: "Sage-femme" },
];

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Agenda — MamaCare AI" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("consultation");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const appts = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: true });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      if (!title || !date) throw new Error("Titre et date requis");
      const at = new Date(`${date}T${time}:00`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        user_id: u.user.id, title, appointment_type: kind, appointment_date: at,
        location: location || null, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendez-vous ajouté");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setOpen(false); setTitle(""); setLocation(""); setNotes(""); setDate("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const now = new Date();
  const upcoming = (appts.data ?? []).filter((a: any) => isAfter(new Date(a.appointment_date), now) || isSameDay(new Date(a.appointment_date), now));
  const past = (appts.data ?? []).filter((a: any) => !upcoming.includes(a));

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Vos rendez-vous médicaux & échographies.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="t">Titre</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Échographie T2" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="d">Date</Label>
                  <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="h">Heure</Label>
                  <Input id="h" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="l">Lieu</Label>
                <Input id="l" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cabinet, hôpital..." />
              </div>
              <div>
                <Label htmlFor="n">Notes</Label>
                <Textarea id="n" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={() => add.mutate()} disabled={add.isPending} className="w-full rounded-full">
                {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">À venir</h2>
        <div className="mt-3 space-y-3">
          {upcoming.length === 0 && (
            <div className="rounded-3xl bg-card p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
            </div>
          )}
          {upcoming.map((a: any) => <ApptCard key={a.id} a={a} highlight />)}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Historique</h2>
          <div className="mt-3 space-y-3 opacity-70">
            {past.slice(0, 5).map((a: any) => <ApptCard key={a.id} a={a} />)}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function ApptCard({ a, highlight }: { a: any; highlight?: boolean }) {
  const d = new Date(a.appointment_date);
  return (
    <article className={`rounded-3xl p-5 shadow-card ${highlight ? "gradient-baby" : "bg-card"}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white/70 backdrop-blur">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold">{a.title}</p>
          <p className="text-xs text-muted-foreground">{format(d, "EEEE d MMMM · HH'h'mm", { locale: fr })}</p>
          {a.location && <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground/70"><MapPin className="h-3 w-3" /> {a.location}</p>}
          {a.notes && <p className="mt-2 text-sm text-foreground/80">{a.notes}</p>}
        </div>
      </div>
    </article>
  );
}
