// useRenderCount.ts
import { useRef } from 'react'

export function useRenderCount() {
  const countRef = useRef(0)
  countRef.current += 1
  return countRef.current
}