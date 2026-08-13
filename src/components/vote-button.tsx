export function VoteButton({
  count,
  voted,
  disabled,
  onClick,
}: {
  count: number;
  voted: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={voted}
      aria-label={voted ? "Remove your vote" : "Vote for this entry"}
      className={`mt-3 flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 font-mono text-[10px] transition-colors disabled:opacity-50 ${
        voted
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <span aria-hidden className="text-[11px] leading-none">
        ▲
      </span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
