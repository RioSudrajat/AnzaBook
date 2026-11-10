import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({ meta: [{ title: `Create account | ${siteConfig.name}` }] }),
  component: SignUp,
});

function SignUp() {
  const search = Route.useSearch();
  return (
    <AuthForm
      mode="sign-up"
      redirectTo={search.redirect}
      socialError={!!search.error}
    />
  );
}
