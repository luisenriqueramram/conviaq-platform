import React from "react";
import { cn } from "@/lib/utils";

export function GlassPanel({
  title,
  subtitle,
  right,
  children,
  className,
  variant = "default",
  spotlight = false,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent";
  spotlight?: boolean;
}) {
  const isAccent = variant === "accent";

  return (
    <section
      data-spotlight={spotlight ? "card" : undefined}
      className={cn(
        "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]",
        isAccent && "border-accent/25 bg-accent/5",
        className
      )}
    >
      {(title || subtitle || right) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            {title && <h3 className="text-white font-semibold">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      <div className={cn("px-6 pb-6", (title || subtitle || right) && "pt-4")}>
        {children}
      </div>
    </section>
  );
}
