import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-primary/30 bg-primary/10 px-4 py-2 text-center font-mono text-[11px] tracking-wide text-foreground">
      Test mode — payments made here are not real.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        Read more
      </a>
    </div>
  );
}
