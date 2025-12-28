import * as React from "react"

type DivProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={
        "rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-50 shadow-sm " +
        className
      }
      {...props}
    />
  )
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return (
    <div
      className={"flex flex-col space-y-1.5 px-4 pt-4 " + className}
      {...props}
    />
  )
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return (
    <h3
      className={
        "text-base font-semibold leading-none tracking-tight " + className
      }
      {...props}
    />
  )
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return (
    <p
      className={"text-sm text-muted-foreground " + className}
      {...props}
    />
  )
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={"px-4 pb-4 " + className} {...props} />
}
