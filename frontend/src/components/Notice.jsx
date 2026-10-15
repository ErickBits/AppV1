/** Inline message: pink for errors, mint for confirmations. */
export default function Notice({ kind = "info", children }) {
  if (!children) return null;
  const style = kind === "error" ? "bg-pink" : "bg-mint";
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`${style} animate-pop rounded-xl border-3 border-ink px-4 py-3 text-sm font-bold shadow-hard-sm`}
    >
      {kind === "error" ? "✕ " : "✓ "}
      {children}
    </p>
  );
}
