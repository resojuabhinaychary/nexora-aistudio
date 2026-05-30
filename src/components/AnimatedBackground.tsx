export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[oklch(0.75_0.16_250/_0.18)] blur-3xl animate-aurora" />
      <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-[oklch(0.78_0.14_220/_0.18)] blur-3xl animate-float-orb" />
      <div className="absolute bottom-[-12rem] left-1/4 h-[560px] w-[560px] rounded-full bg-[oklch(0.82_0.12_260/_0.16)] blur-3xl animate-aurora" />
      <div className="absolute inset-0 bg-[radial-gradient(oklch(0.5_0.05_260/_0.06)_1px,transparent_1px)] [background-size:28px_28px] opacity-50" />
    </div>
  );
}
