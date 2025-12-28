import * as React from "react"

type SpanProps = React.HTMLAttributes<HTMLSpanElement>

interface BadgeProps extends SpanProps {
  variant?: "default" | "secondary" | "outline"
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  let base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"

  let styles = ""

  switch (variant) {
    case "secondary":
      styles =
        "border-zinc-700 bg-zinc-800 text-zinc-100"
      break
    case "outline":
      styles =
        "border-zinc-500 text-zinc-100"
      break
    default:
      styles =
        "border-emerald-500 bg-emerald-500/10 text-emerald-300"
      break
  }

  return <span className={`${base} ${styles} ${className}`} {...props} />
}
