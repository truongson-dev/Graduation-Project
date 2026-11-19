import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (typeof window.matchMedia !== "function") {
      setIsMobile(typeof window.innerWidth === "number" ? window.innerWidth < breakpoint : false)
      return
    }

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else if ((mql as any).addListener) {
      (mql as any).addListener(onChange)
    }
    setIsMobile(window.innerWidth < breakpoint)
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else if ((mql as any).removeListener) {
        (mql as any).removeListener(onChange)
      }
    }
  }, [breakpoint])

  return !!isMobile
}
