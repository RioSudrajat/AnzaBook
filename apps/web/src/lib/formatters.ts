import type { BookDistributionModel } from "@starter/shared/types";
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

export function formatDigitalPolicy(
  policy?: BookDistributionModel | string | null,
): string {
  if (!policy) return "Standar";
  switch (policy) {
    case "single_purchase":
      return "Beli Satuan Digital";
    case "nakama_subscription":
      return "Langganan Nakama";
    case "free_open":
    case "free":
      return "Gratis Terbuka";
    default:
      return policy.replace(/_/g, " ");
  }
}

export const formatDistributionModel = formatDigitalPolicy;

export function formatSourceLanguage(lang?: string | null): string {
  switch (lang) {
    case "id":
      return "Bahasa Indonesia";
    case "en":
      return "Bahasa Inggris";
    default:
      return lang || "Bahasa Indonesia";
  }
}

export function formatTargetAudience(audience?: string | null): string {
  switch (audience) {
    case "general":
      return "Umum";
    case "young_adult":
      return "Remaja (13+)";
    case "mature_academic":
      return "Dewasa & Akademik";
    default:
      return audience || "Umum";
  }
}
