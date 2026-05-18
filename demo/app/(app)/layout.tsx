import { BottomNav } from "@/components/nav/bottom-nav";
import { TopNav } from "@/components/nav/top-nav";
import { DemoStoreProvider } from "@/lib/demo/store";
import { DemoBanner } from "@/components/demo-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoStoreProvider>
      <div className="min-h-dvh flex flex-col">
        <DemoBanner />
        <TopNav />
        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
        </main>
        <BottomNav />
      </div>
    </DemoStoreProvider>
  );
}
