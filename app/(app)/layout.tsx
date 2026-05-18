import { requireSession } from "@/lib/auth/session";
import { BottomNav } from "@/components/nav/bottom-nav";
import { TopNav } from "@/components/nav/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-dvh flex flex-col">
      <TopNav />
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
