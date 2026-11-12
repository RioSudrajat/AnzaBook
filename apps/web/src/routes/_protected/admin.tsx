import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { roleHasPermission } from "@starter/shared/permissions";
import { siteConfig } from "@/config/site";
import {
  AdminCmsDashboard,
  type TabId,
} from "@/features/admin/components/admin-cms-dashboard";
import { adminNotesQuery, adminOverviewQuery } from "@/features/admin/queries";

const adminSearchSchema = z.object({
  tab: z
    .enum([
      "calendars",
      "partners",
      "manuscripts",
      "claim-batches",
      "financials",
      "notes",
    ])
    .optional(),
});

export const Route = createFileRoute("/_protected/admin")({
  validateSearch: adminSearchSchema,
  head: () => ({
    meta: [{ title: `Redaksi & Kemitraan CMS | ${siteConfig.name}` }],
  }),
  beforeLoad: ({ context }) => {
    const userRole = context.session?.user.role || "";
    const roles = userRole.split(",").map((r) => r.trim());
    const isAdmin = roles.includes("admin");
    const canReadNotes = roleHasPermission(userRole, { notes: ["read-any"] });

    if (!isAdmin && !canReadNotes) {
      throw notFound();
    }
  },
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData(adminOverviewQuery()),
      context.queryClient.ensureQueryData(adminNotesQuery()),
    ]);
  },
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext().session;
  const search = Route.useSearch();
  const navigate = useNavigate();

  const handleTabChange = (tab: TabId) => {
    void navigate({
      to: "/admin",
      search: { tab },
    });
  };

  return (
    <AdminCmsDashboard
      currentUser={user}
      activeTabProp={search.tab}
      onTabChangeProp={handleTabChange}
    />
  );
}
