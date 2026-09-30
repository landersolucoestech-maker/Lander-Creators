import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="shell">
      <ResetPasswordForm
        token={params.token ?? ""}
        invalid={Boolean(params.error) || !params.token}
      />
    </main>
  );
}
