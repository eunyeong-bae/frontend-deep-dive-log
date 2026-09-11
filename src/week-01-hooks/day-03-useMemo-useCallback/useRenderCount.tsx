// useRenderCount.ts
import { useRef } from 'react'

export function useRenderCount() {
  const countRef = useRef(0)
  // eslint-disable-next-line react-hooks/refs -- 디버그 전용 렌더 카운터, UI 로직에 영향 없음
  countRef.current += 1
  return countRef.current
}