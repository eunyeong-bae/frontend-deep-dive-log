# 모던 리액트 딥다이브 실습 (4) — useEffect로 검색 만들기: 기본편에서 걸린 것들

딥다이브 3.1.2. Day 2는 "입력창에 타이핑하면 가짜 API로 유저를 검색"하는
컴포넌트. 디바운스·레이스 처리는 다음 편이고, 이 글은 **기본 요구사항 5개만**
먼저 구현하면서 리뷰받고 고친 기록이다.

기본 요구사항:
1. 입력창 + 입력값 state
2. `useEffect`로 검색어 변화에 반응해 API 호출, 결과 렌더
3. 의존성 배열 정확히
4. 빈 입력이면 호출하지 않고 **결과도 비운다**
5. 로딩 표시

---

## 1차 구현

```tsx
export function UserSearch() {
  const [input, setInput] = useState('')
  const [users, setUsers] = useState<User[]>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (input === '') return

    const getUsers = async () => {
      setIsLoading(true)
      const result = await searchUsers(input)
      setUsers(result)
      setIsLoading(false)
    }
    getUsers()
  }, [input])

  if (isLoading) return <div>검색 중 ....</div>

  return (
    <div>
      <input type="input" value={input} onChange={(e) => setInput(e.target.value)} />
      {users?.map((user) => (
        <ul key={user.id}>
          <li>{user.name}</li>
          <li>{user.email}</li>
        </ul>
      ))}
    </div>
  )
}
```

"타이핑하면 결과가 나온다"는 동작하지만, 리뷰에서 5개가 걸렸다.

---

## 이슈 1 — 로딩이 화면 전체를 갈아치운다

```tsx
if (isLoading) return <div>검색 중 ....</div>
```

이렇게 하면 로딩 중에 **`<input>`이 DOM에서 통째로 사라진다.** 사용자는 검색 중에
글자를 더 못 치고, 커서 포커스도 날아간다. 나중에 디바운스 테스트를 짤 때도
"입력창이 없다"고 깨진다.

로딩은 입력창을 **대체**하는 게 아니라 **옆에** 표시한다.

```tsx
return (
  <div>
    <input ... />
    {isLoading && <p>검색 중…</p>}
    <ul>{/* 결과 */}</ul>
  </div>
)
```

---

## 이슈 2 — 빈 입력일 때 결과가 안 지워진다

요구사항 4는 "빈 입력이면 호출하지 않고 **결과도 비운다**"였다. 1차 코드는
`if (input === '') return`으로 호출만 막았다. `users`에는 이전 결과가 그대로 남는다.
→ "ali" 검색 → 결과 표시 → 입력 삭제 → early return → 화면에 옛 결과가 계속 보임.

처음엔 이렇게 고치려 했다.

```tsx
useEffect(() => {
  if (input.trim() === '') {
    setUsers([])   // ⚠️ 여기서 ESLint 경고
    return
  }
  ...
}, [input])
```

그런데 `setUsers([])` 줄에 에디터가 경고를 띄웠다.

> **Calling setState synchronously within an effect**

### 이 경고의 정체

- **런타임 에러가 아니다.** `eslint-plugin-react-hooks` v7이 새로 넣은 규칙
  (`set-state-in-effect`)이고, `pnpm build`(= `tsc` + `vite build`)는 막지 않는다.
  에디터의 ESLint 연동이 보여주는 "냄새 경고".

- **왜 규칙이 있나:** effect 본문에서 **동기적으로** `setState`를 부르면
  `렌더 → effect → setState → 즉시 재렌더`로 렌더가 한 번 더 돈다. 그리고 대개
  이건 "그 값은 렌더 중에 계산했어야 한다"는 신호다. (Day 1에서 배운 "파생값을
  상태로 두지 마라"와 같은 원리)

- **`setState`가 effect에서 항상 금지는 아니다.** `await` 뒤, `.then()` 콜백,
  이벤트 핸들러, 클린업 안에서는 괜찮다. 규칙이 잡는 건 **동기 경로**뿐.
  이 코드의 `setUsers(result)`(await 뒤), `setIsLoading(false)`는 문제없다.

### 고친 방법 — 지우지 말고 파생시킨다

`users`는 "마지막 검색 결과"이고, **화면에 보일지는 `input`으로 판단**하면
`setState`가 필요 없다.

```tsx
useEffect(() => {
  const query = input.trim()
  if (query === '') return        // API 호출만 막음
  // ...검색
}, [input])

// 렌더 본문
const results = input.trim() === '' ? [] : users
```

렌더에서 `users` 대신 `results`를 쓴다. 입력을 지우면 `results`가 `[]`가 되어
화면에서 사라진다 — 재렌더 추가도, 린트 경고도 없다.

> 부작용: "ali" 지우고 "bob" 치면 fetch가 끝나기 전까지 `users`엔 아직 Alice가
> 있어서 잠깐 이전 결과가 보인다. 이건 디바운스 + 로딩 상태(다음 편)로 해결된다.

---

## 이슈 3 — 실패하면 로딩이 영원히 안 풀린다

```tsx
setIsLoading(true)
const result = await searchUsers(input)  // reject되면 아래로 안 감
setUsers(result)
setIsLoading(false)                       // 실행 안 됨 → "검색 중…" 영구 고정
```

가짜 API는 검색어에 `err`가 들어가면 reject하도록 만들어 뒀다. 그 경우
`setIsLoading(false)`가 실행되지 않는다. 에러 UI는 응용 범위지만, **로딩 해제는
`finally`로** 지금 처리한다.

```tsx
const run = async () => {
  setIsLoading(true)
  try {
    const result = await searchUsers(query)
    setUsers(result)
  } finally {
    setIsLoading(false)  // 성공하든 실패하든 항상
  }
}
```

---

## 이슈 4 — async catch에서 throw = unhandled rejection

`finally`를 넣으면서 `catch`도 같이 넣었는데, 이렇게 썼다.

```tsx
} catch {
  setUsers([])
  throw new Error('에러 발생')   // ❌
}
```

`run()`(또는 `getUsers()`)은 effect에서 그냥 호출만 된다 — `await`하거나 `.catch`
하는 곳이 없다. 그래서 여기서 `throw`하면 **unhandled promise rejection**이 되고,
테스트/콘솔에 경고가 뜬다. 게다가 새 `Error`로 감싸면서 원본 에러와
`AbortError`(취소) 구분도 잃는다.

에러 상태는 다음 편(응용)에서 `setError`로 제대로 처리한다. 지금은 `throw` 줄을
지운다.

---

## 자잘한 것들

| 1차 | 고침 | 이유 |
|---|---|---|
| `useState<User[]>()` | `useState<User[]>([])` | `users?.map`의 `?.` 불필요, 항상 배열 |
| `<ul key><li>name</li><li>email</li></ul>` (유저마다 `<ul>`) | `<ul>` 하나 + 유저당 `<li>` 하나 | 리스트 시맨틱, 스크린리더 |
| `type="input"` | `type="text"` | `input`은 없는 타입 (브라우저가 text로 fallback) |
| `console.log(result)` | 삭제 | 디버깅 잔재 |
| `onChange={(e) => handleKeyword(e)}` | `onChange={handleKeyword}` | 래퍼 화살표 불필요 |
| 가드 `input.trim()` / 호출 `input` | effect 맨 위 `const query = input.trim()`로 통일 | 일관성 |

---

## 메타 교훈 — "절반만 고치기"를 조심

두 번째 리뷰에서 이런 패턴이 나왔다:

- 로딩: **좋은 버전**(`{isLoading && ...}`)을 추가했는데 **나쁜 버전**
  (`if (isLoading) return ...`)을 안 지웠다 → 나쁜 버전이 먼저 걸려서 그대로 버그
- 빈 입력: `setUsers([])`를 **지웠는데** 대체할 파생 로직(`results`)을 **안 넣었다**
  → 요구사항 4는 여전히 미충족

새 코드를 넣을 때 **낡은 코드를 같이 지웠는지**, 하나를 지웠으면 **대체가
들어갔는지**를 매번 확인하자.

---

## 기본편 완성 코드

```tsx
import { useEffect, useState } from 'react'
import { searchUsers, type User } from './fakeApi'

export function UserSearch() {
  const [input, setInput] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const query = input.trim()
    if (query === '') return

    const run = async () => {
      setIsLoading(true)
      try {
        const result = await searchUsers(query)
        setUsers(result)
      } finally {
        setIsLoading(false)
      }
    }
    run()
  }, [input])

  const results = input.trim() === '' ? [] : users

  return (
    <div>
      <input
        type="text"
        placeholder="검색어를 입력하세요..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {isLoading && <p>검색 중…</p>}
      <ul>
        {results.map((user) => (
          <li key={user.id}>{user.name} — {user.email}</li>
        ))}
      </ul>
    </div>
  )
}
```

> 아직 **클린업도 레이스 처리도 없다.** 빠르게 타이핑하면 요청이 매 글자마다
> 나가고, 느린 응답이 빠른 응답을 덮어쓸 수 있다. 그건 다음 편에서.

## 배운 것

1. 로딩·에러 표시는 UI를 **대체**하지 말고 **곁들인다**. 입력이 사라지면 안 된다.
2. effect 본문의 동기 `setState`는 ESLint가 경고한다. 대개 **파생으로 바꾸라**는 뜻.
   `await` 뒤·콜백·클린업의 `setState`는 괜찮다.
3. async 함수는 `finally`로 로딩을 해제한다. 호출부에서 안 잡는 async 함수에서
   `throw`하면 unhandled rejection이 된다.
4. 코드를 고칠 땐 "낡은 것을 지웠나 / 지운 것의 대체가 들어갔나"를 확인한다.

---

#React #useEffect #리액트훅 #데이터페칭 #파생상태 #ESLint #eslintpluginreacthooks #setstateineffect #로딩상태 #에러핸들링 #unhandledrejection #모던리액트딥다이브 #프론트엔드 #TIL
