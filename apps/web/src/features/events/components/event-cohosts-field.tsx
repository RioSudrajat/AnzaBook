import * as React from "react";
import { ChevronDown, Plus, Users, X } from "lucide-react";
import { sanitizeCoHostAvatarUrl } from "@starter/shared/validators/community";
import type {
  CommunityCalendarDto,
  EventCoHostDto,
} from "@starter/shared/types";
import { Input } from "@/components/ui/input";
import { useCalendarMembers } from "../hooks";

const MAX_COHOSTS = 5;

interface EventCoHostsFieldProps {
  coHosts: EventCoHostDto[];
  onChange: (next: EventCoHostDto[]) => void;
  calendarSlug?: string;
  calendars?: CommunityCalendarDto[];
  variant?: "card" | "ruled";
}

export function EventCoHostsField({
  coHosts,
  onChange,
  calendarSlug,
  calendars = [],
  variant = "card",
}: EventCoHostsFieldProps) {
  const [isOpen, setIsOpen] = React.useState(coHosts.length > 0);
  const [isQuickPickOpen, setIsQuickPickOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [roleLabel, setRoleLabel] = React.useState("Co-Host");
  const { data: members = [] } = useCalendarMembers(calendarSlug || "");

  const partnerOptions = React.useMemo(() => {
    const existingNames = new Set(
      coHosts.map((item) => item.name.trim().toLowerCase()),
    );
    const items: Array<{
      key: string;
      label: string;
      coHost: EventCoHostDto;
    }> = [];

    for (const member of members) {
      if (member.role === "member") continue;
      if (existingNames.has(member.name.trim().toLowerCase())) continue;
      items.push({
        key: `member:${member.id}`,
        label: `${member.name} (${
          member.role === "owner"
            ? "Pemilik Komunitas"
            : member.role === "admin"
              ? "Host Pengelola"
              : "Petugas Check-in"
        })`,
        coHost: {
          name: member.name,
          avatarUrl: sanitizeCoHostAvatarUrl(member.image),
          roleLabel:
            member.role === "owner" || member.role === "admin"
              ? "Co-Host"
              : "Tim Acara",
        },
      });
    }

    for (const cal of calendars) {
      if (cal.slug === calendarSlug) continue;
      if (existingNames.has(cal.name.trim().toLowerCase())) continue;
      items.push({
        key: `cal:${cal.id}`,
        label: `${cal.name} (Kolaborasi Komunitas)`,
        coHost: {
          name: cal.name,
          avatarUrl: sanitizeCoHostAvatarUrl(cal.avatarUrl),
          roleLabel: "Kolaborator Komunitas",
        },
      });
    }

    return items;
  }, [members, calendars, calendarSlug, coHosts]);

  const addCoHostEntry = (entry: EventCoHostDto) => {
    if (coHosts.length >= MAX_COHOSTS) return;
    const cleanName = entry.name.trim();
    if (!cleanName) return;
    const exists = coHosts.some(
      (item) => item.name.trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (exists) return;

    const cleanRole = entry.roleLabel?.trim();
    const cleanAvatarUrl = sanitizeCoHostAvatarUrl(entry.avatarUrl);
    onChange([
      ...coHosts,
      {
        name: cleanName,
        ...(cleanAvatarUrl ? { avatarUrl: cleanAvatarUrl } : {}),
        ...(cleanRole ? { roleLabel: cleanRole } : {}),
      },
    ]);
  };

  const handleManualAdd = () => {
    if (!name.trim() || coHosts.length >= MAX_COHOSTS) return;
    addCoHostEntry({ name, roleLabel });
    setName("");
  };

  const handleRemove = (index: number) => {
    onChange(coHosts.filter((_, idx) => idx !== index));
  };

  return (
    <div
      className={
        variant === "ruled"
          ? "text-xs"
          : "rounded-xl border border-border bg-[var(--color-paper-2)] p-3.5 text-xs"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users
            className="size-4 text-[var(--color-accent)] shrink-0"
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">
            Co-Host &amp; Kolaborator
          </span>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            ({coHosts.length}/{MAX_COHOSTS})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="min-h-11 px-2 text-xs text-[var(--color-accent)] hover:underline font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
        >
          {isOpen ? "Tutup" : "+ Tambah"}
        </button>
      </div>

      {coHosts.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {coHosts.map((ch, idx) => (
            <li
              key={`${ch.name}-${idx}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
            >
              {ch.avatarUrl ? (
                <img
                  src={ch.avatarUrl}
                  alt={ch.name}
                  className="size-5 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[10px] font-bold text-foreground shrink-0">
                  {ch.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="font-medium max-w-[140px] truncate">
                {ch.name}
              </span>
              {ch.roleLabel && (
                <span className="text-[11px] text-muted-foreground">
                  ({ch.roleLabel})
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`Hapus kolaborator ${ch.name}`}
                className="ml-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && (
        <div className="mt-3 space-y-2.5 border-t border-border pt-3">
          {partnerOptions.length > 0 && coHosts.length < MAX_COHOSTS && (
            <div className="relative space-y-1">
              <button
                type="button"
                aria-expanded={isQuickPickOpen}
                onClick={() => setIsQuickPickOpen((prev) => !prev)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-xs text-foreground hover:border-foreground/30 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span>
                  Pilih cepat dari pengurus atau komunitas (
                  {partnerOptions.length})
                </span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform ${
                    isQuickPickOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isQuickPickOpen && (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg space-y-0.5">
                  {partnerOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        addCoHostEntry(opt.coHost);
                        if (coHosts.length + 1 >= MAX_COHOSTS) {
                          setIsQuickPickOpen(false);
                        }
                      }}
                      className="flex w-full min-h-11 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="truncate">{opt.label}</span>
                      <Plus
                        className="size-3.5 shrink-0 text-[var(--color-accent)]"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-2 items-center">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleManualAdd();
                }
              }}
              disabled={coHosts.length >= MAX_COHOSTS}
              placeholder="Nama co-host / pembicara / mitra"
              aria-label="Nama kolaborator acara"
              className="bg-background border-border text-xs h-11"
            />
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleManualAdd();
                }
              }}
              disabled={coHosts.length >= MAX_COHOSTS}
              placeholder="Peran (mis. Moderator)"
              aria-label="Peran kolaborator acara"
              className="bg-background border-border text-xs h-11"
            />
            <button
              type="button"
              onClick={handleManualAdd}
              disabled={!name.trim() || coHosts.length >= MAX_COHOSTS}
              className="inline-flex h-11 min-h-11 items-center justify-center gap-1 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-3.5 text-xs font-semibold text-foreground hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Kolaborator tampil di kartu dan halaman acara. Untuk memberi akses
            kelola/edit/check-in, tambahkan mereka di tab{" "}
            <strong className="text-foreground">Pengurus &amp; Anggota</strong>{" "}
            komunitas.
          </p>
        </div>
      )}
    </div>
  );
}
