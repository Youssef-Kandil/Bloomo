import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-background overflow-hidden">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-fade"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -end-40 size-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -start-40 size-96 rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative w-full max-w-md animate-slide-in">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
            <Sparkles className="size-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gradient">Bloomo</span>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 md:p-8 shadow-elevated">
          {children}
        </div>
      </div>
    </div>
  );
}
