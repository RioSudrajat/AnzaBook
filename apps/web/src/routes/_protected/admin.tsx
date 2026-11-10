import { createFileRoute, notFound } from "@tanstack/react-router";
import { roleHasPermission } from "@starter/shared/permissions";
import { siteConfig } from "@/config/site";
import { AdminCmsDashboard } from "@/features/admin/components/admin-cms-dashboard";
import { adminNotesQuery, adminOverviewQuery } from "@/features/admin/queries";

export const Route = createFileRoute("/_protected/admin")({
  head: () => ({
    meta: [{ title: `Redaksi & Kemitraan CMS | ${siteConfig.name}` }],
  }),
  // Without admin role or notes:read-any this renders not-found, so the route
  // stays invisible to unauthorized accounts. The role comes from the session;
  // the API re-checks permissions on every request.
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

  return <AdminCmsDashboard currentUser={user} />;
}
