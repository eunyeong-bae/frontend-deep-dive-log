export type User = { id: number; name: string; email: string }

const DB: User[] = [
  { id: 1, name: 'Alice Kim', email: 'alice@example.com' },
  { id: 2, name: 'Bob Lee', email: 'bob@example.com' },
  { id: 3, name: 'Carol Park', email: 'carol@example.com' },
  { id: 4, name: 'Dave Choi', email: 'dave@example.com' },
  { id: 5, name: 'Erin Jung', email: 'erin@example.com' },
  { id: 6, name: 'Alicia Song', email: 'alicia@example.com' },
]

type Options = { signal?: AbortSignal; latency?: number }

// query에 'err'가 포함되면 실패 (에러 상태 테스트용)
// latency를 쿼리마다 다르게 주면 race를 재현할 수 있음
export function searchUsers(query: string, { signal, latency = 300 }: Options = {}): Promise<User[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (query.includes('err')) {
        reject(new Error('검색 실패'))
        return
      }
      const q = query.trim().toLowerCase()
      resolve(q ? DB.filter((u) => u.name.toLowerCase().includes(q)) : [])
    }, latency)

    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}