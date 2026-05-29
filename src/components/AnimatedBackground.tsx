export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-violet/40 blur-3xl animate-aurora" />
      <div className="absolute top-1/4 right-0 h-[380px] w-[380px] rounded-full bg-indigo/30 blur-3xl animate-float-orb" />
      <div className="absolute bottom-0 left-1/3 h-[460px] w-[460px] rounded-full bg-fuchsia/20 blur-3xl animate-aurora" />
      <div className="absolute inset-0 bg-[radial-gradient(oklch(1_0_0_/_0.04)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
    </div>
  );
}