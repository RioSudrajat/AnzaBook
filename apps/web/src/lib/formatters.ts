import { getManuscriptStatusMeta } from "@/features/publisher/publisher-helpers";

export function formatRoleName(role?: string | null): string {
  if (!role) return "Anggota";
  switch (role.toLowerCase()) {
    case "owner":
      return "Pemilik";
    case "admin":
      return "Pengelola";
    case "editor":
      return "Editor Redaksi";
    case "checkin_staff":
      return "Staf Presensi";
    case "finance":
      return "Staf Keuangan";
    case "member":
      return "Anggota";
    default:
      return role.replace(/_/g, " ");
  }
}

export function formatManuscriptStatus(status?: string | null): string {
  return getManuscriptStatusMeta(status).label;
}

export function formatDigitalPolicy(policy?: string | null): string {
  if (!policy) return "Standar";
  switch (policy) {
    case "hybrid_nakama_alacarte":
      return "Hibrida (Nakama & Pembelian)";
    case "alacarte_only":
      return "Pembelian Satuan";
    case "sample_only":
      return "Koleksi Nakama";
    case "print_claim_only":
      return "Klaim Cetak Fisik";
    case "free_open":
    case "free":
      return "Akses Terbuka";
    default:
      return policy.replace(/_/g, " ");
  }
}
