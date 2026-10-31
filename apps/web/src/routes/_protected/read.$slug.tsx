import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const readSearchSchema = z.object({
  mode: z.enum(["full", "blueprint", "audio"]).default("full"),
  chapter: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_protected/read/$slug")({
  validateSearch: readSearchSchema,
  component: ReaderPageStub,
});

function ReaderPageStub() {
  return <div>Memuat pembaca digital...</div>;
}
