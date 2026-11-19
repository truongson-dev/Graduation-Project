import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/core/utils/cn"
import { CheckIcon, MinusIcon } from "lucide-react"

function Checkbox({
  className,
  indeterminate,
  ...props
}: CheckboxPrimitive.Root.Props & {
  indeterminate?: boolean
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground data-indeterminate:bg-primary data-indeterminate:border-primary data-indeterminate:text-primary-foreground",
        className
      )}
      indeterminate={indeterminate}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {indeterminate ? (
          <MinusIcon className="size-3 stroke-[3]" />
        ) : (
          <CheckIcon className="size-3 stroke-[3]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
