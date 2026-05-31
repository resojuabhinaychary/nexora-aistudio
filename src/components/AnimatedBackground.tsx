export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-[oklch(0.86_0.12_250/_0.55)] blur-3xl animate-aurora" />
      <div className="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-[oklch(0.88_0.11_200/_0.5)] blur-3xl animate-float-orb" />
      <div className="absolute bottom-[-14rem] left-1/4 h-[600px] w-[600px] rounded-full bg-[oklch(0.86_0.11_295/_0.45)] blur-3xl animate-aurora" />
      <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-[oklch(0.9_0.1_165/_0.35)] blur-3xl animate-float-orb" />
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.5_0.05_260/_0.05)_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />
    </div>
  );
}
