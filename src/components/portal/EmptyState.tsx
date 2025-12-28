import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  hint,
  actionHref,
  actionLabel,
  secondaryActionHref,
  secondaryActionLabel,
  className,
}: {
  title: string;
  description?: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-8 text-center",
        className
      )}
    >
      <div className="max-w-md mx-auto space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20"></div>
        </div>
        
        <h3 className="text-lg font-semibold text-white">{title}</h3>

        {description && (
          <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        )}
        
        {hint && (
          <p className="text-xs text-zinc-600 italic">{hint}</p>
        )}

        {(actionHref && actionLabel) && (
          <div className="flex gap-3 justify-center pt-2">
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all shadow-lg shadow-blue-500/20"
            >
              {actionLabel}
            </Link>
            
            {secondaryActionHref && secondaryActionLabel && (
              <Link
                href={secondaryActionHref}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-all"
              >
                {secondaryActionLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
