import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min?: number
  max?: number
  step?: number
  value?: number
  onValueChange?: (value: number) => void
}

function Slider({ className, min = 0, max = 100, step = 1, value, onValueChange, ...props }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700",
        "accent-primary",
        className
      )}
      {...props}
    />
  )
}

export { Slider, type SliderProps }
