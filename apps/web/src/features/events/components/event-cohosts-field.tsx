import * as React from "react";
import { Plus, Users, X } from "lucide-react";
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
}

export function EventCoHostsField({
  coHosts,
  onChange,
  calendarSlug,
  calendars = [],
}: EventCoHostsFieldProps) {
  const [isOpen, setIsOpen] = React.useState(coHosts.length > 0);
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-amber-400 shrink-0" />
          <span className="font-medium text-white">
            Co-Host &amp; Kolaborator
          </span>
          <span className="text-[10px] text-white/40">
            ({coHosts.length}/{MAX_COHOSTS} · Opsional)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
        >
          {isOpen ? "Tutup" : "+ Tambah"}
        </button>
      </div>

      {coHosts.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {coHosts.map((ch, idx) => (
            <li
              key={`${ch.name}-${idx}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/35 px-2.5 py-1.5 text-white"
            >
              {ch.avatarUrl ? (
                <img
                  src={ch.avatarUrl}
                  alt={ch.name}
                  className="size-5 rounded-full object-cover border border-white/20 shrink-0"
                />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300 shrink-0">
                  {ch.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="font-medium max-w-[140px] truncate">
                {ch.name}
              </span>
              {ch.roleLabel && (
                <span className="text-[10px] text-white/55">
                  ({ch.roleLabel})
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`Hapus kolaborator ${ch.name}`}
                className="ml-0.5 rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && (
        <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
          {partnerOptions.length > 0 && coHosts.length < MAX_COHOSTS && (
            <div className="space-y-1">
              <label
                htmlFor="quick-pick-cohost"
                className="block text-[11px] text-white/60"
              >
                Pilih Cepat dari Pengurus atau Komunitas Kolaborasi
              </label>
              <select
                id="quick-pick-cohost"
                value=""
                onChange={(e) => {
                  const chosen = partnerOptions.find(
                    (opt) => opt.key === e.target.value,
                  );
                  if (chosen) addCoHostEntry(chosen.coHost);
                }}
                className="w-full rounded-lg border border-white/15 bg-[#1e2025] px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-amber-400/60"
              >
                <option value="">
                  -- Pilih Pengurus atau Komunitas Partner --
                </option>
                {partnerOptions.map((opt) => (
                  <option
                    key={opt.key}
                    value={opt.key}
                    className="bg-[#1e2025] text-white"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
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
              className="bg-black/30 border-white/10 text-white placeholder-white/30 text-xs h-9"
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
              className="bg-black/30 border-white/10 text-white placeholder-white/30 text-xs h-9"
            />
            <button
              type="button"
              onClick={handleManualAdd}
              disabled={!name.trim() || coHosts.length >= MAX_COHOSTS}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-amber-400/20 px-3 text-xs font-medium text-amber-300 hover:bg-amber-400/30 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Tambah</span>
            </button>
          </div>
          <p className="text-[10px] text-white/45">
            Kolaborator tampil di kartu dan halaman acara. Untuk memberi akses
            kelola/edit/check-in kepada akun lain, tambahkan mereka di tab{" "}
            <strong className="text-white/70">Pengurus &amp; Anggota</strong>{" "}
            komunitas.
          </p>
        </div>
      )}
    </div>
  );
}
