import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, isAfter, isSameDay, startOfDay, endOfWeek, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, MapPin, Loader2, Stethoscope, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KIND_VALUES = ["consultation", "echographie", "vaccin", "examen", "sage-femme"] as const;

type Appt = {
  id: string;
  title: string;
  appointment_type: string;
  appointment_date: string;
  location: string | null;
  notes: string | null;
};

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Agenda — MamaCare AI" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("consultation");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "past" | "today" | "week" | "month">("all");

  const appts = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: true });
      return (data ?? []) as Appt[];
    },
  });

  const reset = () => {
    setEditing(null);
    setTitle("");
    setKind("consultation");
    setDate("");
    setTime("10:00");
    setLocation("");
    setNotes("");
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (a: Appt) => {
    const d = new Date(a.appointment_date);
    setEditing(a);
    setTitle(a.title);
    setKind(a.appointment_type);
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
    setLocation(a.location ?? "");
    setNotes(a.notes ?? "");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      if (!title || !date) throw new Error(t("calendar.fieldTitle") + " + " + t("calendar.date"));
      const at = new Date(`${date}T${time}:00`).toISOString();
      if (editing) {
        const { error } = await supabase
          .from("appointments")
          .update({
            title,
            appointment_type: kind,
            appointment_date: at,
            location: location || null,
            notes: notes || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({
          user_id: u.user.id,
          title,
          appointment_type: kind,
          appointment_date: at,
          location: location || null,
          notes: notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? t("calendar.updated") : t("calendar.created"));
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("calendar.deleted"));
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const now = new Date();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (appts.data ?? []).filter((a) => {
      if (filterType !== "all" && a.appointment_type !== filterType) return false;
      const d = new Date(a.appointment_date);
      switch (filterStatus) {
        case "upcoming":
          if (!(isAfter(d, now) || isSameDay(d, now))) return false;
          break;
        case "past":
          if (isAfter(d, now) || isSameDay(d, now)) return false;
          break;
        case "today":
          if (!isSameDay(d, now)) return false;
          break;
        case "week":
          if (d < startOfDay(now) || d > endOfWeek(now, { weekStartsOn: 1 })) return false;
          break;
        case "month":
          if (d < startOfDay(now) || d > endOfMonth(now)) return false;
          break;
      }
      if (q) {
        const hay = `${a.title} ${a.location ?? ""} ${a.notes ?? ""} ${a.appointment_type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appts.data, search, filterType, filterStatus, now]);

  const upcoming = filtered.filter((a) => isAfter(new Date(a.appointment_date), now) || isSameDay(new Date(a.appointment_date), now));
  const past = filtered.filter((a) => !(isAfter(new Date(a.appointment_date), now) || isSameDay(new Date(a.appointment_date), now)));

  const hasFilters = search || filterType !== "all" || filterStatus !== "all";

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t("calendar.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("calendar.subtitle")}</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> {t("common.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? t("calendar.editTitle") : t("calendar.new")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="t">{t("calendar.fieldTitle")}</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("calendar.placeholderTitle")} />
              </div>
              <div>
                <Label>{t("calendar.type")}</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KIND_VALUES.map((k) => (
                      <SelectItem key={k} value={k}>{t(`calendar.types.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="d">{t("calendar.date")}</Label>
                  <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="h">{t("calendar.time")}</Label>
                  <Input id="h" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="l">{t("calendar.location")}</Label>
                <Input id="l" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("calendar.placeholderLocation")} />
              </div>
              <div>
                <Label htmlFor="n">{t("calendar.notes")}</Label>
                <Textarea id="n" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full rounded-full">
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common.save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filters.search")}
            className="rounded-full pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-auto rounded-full text-xs">
              <SelectValue placeholder={t("filters.type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              {KIND_VALUES.map((k) => (
                <SelectItem key={k} value={k}>{t(`calendar.types.${k}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="h-9 w-auto rounded-full text-xs">
              <SelectValue placeholder={t("filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="upcoming">{t("filters.upcoming")}</SelectItem>
              <SelectItem value="past">{t("filters.past")}</SelectItem>
              <SelectItem value="today">{t("filters.today")}</SelectItem>
              <SelectItem value="week">{t("filters.week")}</SelectItem>
              <SelectItem value="month">{t("filters.month")}</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" /> {t("filters.clear")}
            </button>
          )}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("calendar.upcoming")}</h2>
        <div className="mt-3 space-y-3">
          {upcoming.length === 0 && (
            <div className="rounded-3xl bg-card p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">{hasFilters ? t("filters.noResults") : t("calendar.none")}</p>
            </div>
          )}
          {upcoming.map((a) => (
            <ApptCard
              key={a.id}
              a={a}
              highlight
              onEdit={() => openEdit(a)}
              onDelete={() => {
                if (confirm(t("calendar.confirmDelete"))) remove.mutate(a.id);
              }}
            />
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("calendar.history")}</h2>
          <div className="mt-3 space-y-3 opacity-70">
            {past.slice(0, 5).map((a) => (
              <ApptCard
                key={a.id}
                a={a}
                onEdit={() => openEdit(a)}
                onDelete={() => {
                  if (confirm(t("calendar.confirmDelete"))) remove.mutate(a.id);
                }}
              />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function ApptCard({
  a,
  highlight,
  onEdit,
  onDelete,
}: {
  a: Appt;
  highlight?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="edit"
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/60 text-foreground/70 hover:bg-white"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="delete"
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/60 text-destructive hover:bg-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
