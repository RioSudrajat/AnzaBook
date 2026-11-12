import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/profile/edit")({
  beforeLoad: () => {
    throw redirect({
      to: "/app",
      search: { tab: "profile", view: "edit" },
    });
  },
  component: () => null,
});
