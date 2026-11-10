import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({ meta: [{ title: `Sign in | ${siteConfig.name}` }] }),
  component: SignIn,
});

function SignIn() {
  const search = Route.useSearch();
  return (
    <AuthForm
      mode="sign-in"
      redirectTo={search.redirect}
      socialError={!!search.error}
    />
  );
}
