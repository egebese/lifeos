import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 dot-grid-subtle bg-[color:var(--black)]">
      <div className="w-full max-w-sm">
        <div className="mb-12">
          <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-[color:var(--text-secondary)] mb-2">
            LIFETRACKER / V1
          </div>
          <h1 className="font-display text-4xl tracking-tight text-[color:var(--text-display)]">
            sign in
          </h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
