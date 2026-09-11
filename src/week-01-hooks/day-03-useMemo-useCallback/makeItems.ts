export type Item = {
  id: number
  name: string
  score: number      // 0~100
  category: 'A' | 'B' | 'C'
}

// n개 생성. 결정론적으로 (같은 n이면 같은 결과) — Math.random 대신 id 기반 계산
export function makeItems(n: number): Item[] {
  const cats: Item['category'][] = ['A', 'B', 'C']
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    name: `Item ${i.toString().padStart(4, '0')}`,
    score: (i * 37) % 101,
    category: cats[i % 3],
  }))
}