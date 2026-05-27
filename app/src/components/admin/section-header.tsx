export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}
