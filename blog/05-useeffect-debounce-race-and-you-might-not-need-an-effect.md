# 모던 리액트 딥다이브 실습 (5) — useEffect: 디바운스, 레이스 컨디션, 그리고 "이 effect는 필요 없다"

[Post 4](./04-useeffect-search-basics.md)에서 유저 검색의 기본편을 만들었다. 이번엔
응용·도전 항목: **디바운스 · 레이스 컨디션 처리 · 에러 상태 · "You Might Not
Need an Effect"**. 오늘 배운 것 중 절반은 "effect를 잘 쓰는 법"이고 나머지 절반은
"effect를 안 쓰는 법"이었다.

---

## 1. 디바운스 — setTimeout + 클린업

### 개념 모델

디바운스 = "마지막 입력 후 N ms 동안 조용하면 그때 실행". 구현은:

1. 입력이 올 때마다 타이머를 새로 건다
2. **다음 입력이 오면 이전 타이머를 취소한다**

2번이 `useEffect`의 **클린업**이다. effect가 `[input]`에 의존하니, `input`이
바뀌면 React가 **이전 effect의 클린업을 먼저 실행**하고 새 effect를 실행한다.

```tsx
useEffect(() => {
  const query = input.trim()
  if (query === '') return

  const timer = setTimeout(() => {
    // 검색
  }, 300)

  return () => clearTimeout(timer) // input 바뀌면 대기 중이던 타이머 취소
}, [input])
```

"aaa"를 빠르게 치면: a → 타이머1 걸림 → a → (클린업)타이머1 취소 + 타이머2 걸림
→ a → 타이머2 취소 + 타이머3 걸림 → 300ms 조용 → 타이머3만 실행. 요청 1번.

### 고민: `setIsLoading(true)`는 어디에?

- **타이머 콜백 밖** (effect 본문): 타이핑하는 내내 "검색 중" 표시
- **타이머 콜백 안**: 300ms 지나 실제 요청이 나갈 때부터 표시

나는 **안**에 뒀다. 타이핑 중에는 아직 요청이 없으니 로딩이라 부를 게 없다.
(참고: 콜백 안의 `setIsLoading`은 async 콜백이라 `set-state-in-effect` 린트
경고에 안 걸린다. 규칙은 effect **본문의 동기** setState만 잡는다 — Post 4 참고.)

---

## 2. 레이스 컨디션

### 문제 재현

가짜 API에 쿼리별로 다른 지연을 줄 수 있게 해뒀다.

```ts
searchUsers('ab',  { latency: 500 }) // 요청 A (느림)
searchUsers('abc', { latency: 100 }) // 요청 B (빠름)
```

"ab" 치고 바로 "abc"를 치면 → B가 먼저 도착해 "abc" 결과를 그림 → **그 다음
A가 도착해 "ab" 결과로 덮어씀**. 화면은 "abc" 검색인데 "ab" 결과가 보인다.
응답이 **보낸 순서대로 오지 않기 때문**이다.

### 해법 두 가지

**(a) `ignore` 플래그** — 간단하지만 요청 자체는 계속 나감

```tsx
useEffect(() => {
  let ignore = false
  const timer = setTimeout(async () => {
    const result = await searchUsers(query)
    if (!ignore) setUsers(result) // 이 effect가 이미 정리됐으면 결과 버림
  }, 300)
  return () => {
    clearTimeout(timer)
    ignore = true
  }
}, [input])
```

**(b) `AbortController`** — 실제로 요청을 취소

```tsx
useEffect(() => {
  const controller = new AbortController()
  const timer = setTimeout(async () => {
    const result = await searchUsers(query, { signal: controller.signal })
    setUsers(result)
  }, 300)
  return () => {
    clearTimeout(timer)
    controller.abort() // 진행 중이던 요청을 취소 → AbortError로 reject
  }
}, [input])
```

### 트레이드오프

| | ignore 플래그 | AbortController |
|---|---|---|
| 구현 | 아주 간단 | signal 배선 + abort 에러 처리 필요 |
| 네트워크 | 요청은 그대로 나감, 결과만 무시 | 요청 자체를 취소 |
| 적합 | 가벼운 경우 | 요청이 무겁거나 취소가 중요할 때 |

나는 `fakeApi`가 이미 `signal`을 지원하게 만들어 둬서 **(b)**를 골랐다.
대신 abort되면 `AbortError`로 reject되니 catch에서 걸러야 한다.

---

## 3. 에러 처리에서 걸린 것들

### `catch (error)`의 타입은 `unknown`

TypeScript에서 `catch`의 바인딩은 `unknown`이다. `error.name`에 바로 접근하면
컴파일 에러. 타입 가드가 필요하다.

```tsx
function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === 'AbortError'
}
```

(모듈 스코프에 둔다. effect 안에 정의하면 매 실행마다 재생성되고, 클로저로 잡는
값도 없다.)

### AbortError는 에러가 아니다 — 순서가 중요

처음엔 이렇게 썼다.

```tsx
} catch (error) {
  if (error instanceof Error) {
    setIsError(true)              // ❌ AbortError도 여기 걸림
  }
  if (error?.name === 'AbortError') return  // ❌ 이미 setIsError(true) 한 뒤
}
```

`AbortController.abort()`로 인한 취소는 **정상 동작**이지 사용자에게 보여줄
에러가 아니다. abort 체크가 **맨 먼저** 오고, 아무 state도 안 건드리고 바로
`return` 해야 한다.

```tsx
} catch (error) {
  if (isAbortError(error)) return  // 취소됨 → 최신 요청이 상태를 관리하게 둠
  setIsError(true)
  setIsLoading(false)
}
```

### `isError`를 성공 시 꺼주기

한 번 `setIsError(true)`하면 다음 검색이 성공해도 에러 배너가 남는다.
성공 경로에 `setIsError(false)`를 넣는다.

---

## 4. `finally`의 함정

로딩 해제를 처음엔 `finally`에 뒀다.

```tsx
try {
  setIsLoading(true)
  const result = await searchUsers(query, { signal: controller.signal })
  setUsers(result)
} catch (error) {
  if (isAbortError(error)) return   // ← 여기서 빠져나가지만…
  setIsError(true)
} finally {
  setIsLoading(false)               // ← catch의 return을 "통과해서" 이것도 실행됨
}
```

JavaScript에서 **`finally`는 `catch`의 `return`을 지나서도 실행된다.** 그래서
abort된(취소된) 요청도 `setIsLoading(false)`를 호출한다 — 방금 `isAbortError`
가드로 막으려던 게 바로 이거다. 취소된 옛 요청이, 새로 시작한 요청이 켜 둔
로딩 상태를 꺼버린다.

해결: **`finally`를 빼고** 성공·비-abort-에러 경로에 각각 `setIsLoading(false)`.

> 여기서 또 "절반만 고치기"를 했다. try/catch에 `setIsLoading(false)`를
> 추가하면서 `finally`를 안 지웠다. 새 코드를 넣을 땐 **낡은 코드를 지웠는지**
> 항상 확인. (Post 4에서 스스로 적어놓고 또 반복함)

### 디바운스 + 레이스 + 에러 최종 코드

```tsx
import { useEffect, useState, type ChangeEvent } from 'react'
import { searchUsers, type User } from './fakeApi'

function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === 'AbortError'
}

export function UserSearch() {
  const [input, setInput] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const handleKeyword = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  useEffect(() => {
    const query = input.trim()
    if (query === '') return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true)
        const result = await searchUsers(query, { signal: controller.signal })
        setUsers(result)
        setIsError(false)
        setIsLoading(false)
      } catch (error) {
        if (isAbortError(error)) return
        setIsError(true)
        setIsLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [input])

  const results = input.trim() === '' ? [] : users

  return (
    <div>
      <input type="text" placeholder="검색어를 입력하세요..." value={input} onChange={handleKeyword} />
      {isLoading && <div>검색 중…</div>}
      {isError && <p role="alert">Error!!</p>}
      <ul>
        {results.map((user) => (
          <li key={user.id}>{user.name} — {user.email}</li>
        ))}
      </ul>
      <p>결과 개수: {results.length}명</p>
    </div>
  )
}
```

> 남은 미묘함: 에러가 나도 `results`는 이전 성공 결과를 계속 보여준다(`users`를
> 안 지우니까). "에러 배너 + 이전 결과 유지"로 갈지 "에러 시 결과도 비울지"는
> 설계 선택.

---

## 5. "이 effect는 필요 없다" (You Might Not Need an Effect)

도전 과제는 안티패턴 컴포넌트 3개를 `useEffect` 없이 다시 쓰는 것이었다.
처음엔 목적을 잘 몰랐는데 — **"할 수 있다"가 아니라 "effect로 하면 실제로
나빠진다"**를 겪게 하려는 거였다.

### effect로 파생값을 만들면 생기는 3가지 비용

**① 렌더가 두 번 돈다 + 깜빡임.** `useEffect`는 렌더가 화면에 그려진 뒤 실행된다.

```
렌더(파생값은 아직 옛날 값) → 화면에 그림 → effect → setState → 다시 렌더 → 다시 그림
```

키 하나에 렌더 2번. 그 사이 한 프레임 동안 틀린 값이 보인다.

**② 진실의 원천이 2개 → 동기화 버그.** 파생값을 state에 복사하면, 원본을 바꾸는
모든 경로가 사본도 갱신해야 한다. deps 하나 빠뜨리거나 나중에 입력을 하나 더
추가하면 두 값이 어긋난다.

**③ 그냥 복잡함.** state 하나 더, effect 하나 더, deps 배열 하나 더 관리.

### 규칙

| 상황 | 도구 |
|---|---|
| React **바깥 세계와 동기화** (네트워크, 타이머, 구독, DOM 직접 조작, 브라우저 API) | `useEffect` |
| 데이터가 **다른 데이터/props로부터 나옴** | 그냥 렌더 중 계산 |

`UserSearch`의 fetch는 네트워크와 동기화라 effect가 맞다. 아래 3개는 전부
"데이터 → 데이터"라 effect가 틀린 도구다.

### (a) props를 필터링해 state에 저장

```tsx
// ❌ Bad
function List({ users }: { users: User[] }) {
  const [filtered, setFiltered] = useState<User[]>([])
  useEffect(() => {
    setFiltered(users.filter((u) => u.email.endsWith('@corp.com')))
  }, [users])
  return <ul>{filtered.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}

// ✅ Good — 렌더 중 계산. state도 effect도 없음
function List({ users }: { users: User[] }) {
  const corpUsers = users.filter((u) => u.email.endsWith('@corp.com'))
  return <ul>{corpUsers.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### (b) 두 state를 합쳐 fullName state로

```tsx
// ❌ Bad
const [first, setFirst] = useState('')
const [last, setLast] = useState('')
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(`${first} ${last}`)
}, [first, last])

// ✅ Good
const [first, setFirst] = useState('')
const [last, setLast] = useState('')
const fullName = `${first} ${last}`.trim()
```

### (c) props.userId가 바뀌면 폼 state 리셋

이건 파생은 아니지만 역시 effect보다 나은 도구가 있다 — **`key`**.

```tsx
// ❌ Bad — userId 바뀔 때 effect로 리셋
function ProfileForm({ userId }: { userId: number }) {
  const [bio, setBio] = useState('')
  useEffect(() => {
    setBio('')
  }, [userId])
  // ...
}

// ✅ Good — 부모가 key를 바꾸면 React가 언마운트→재마운트하며 state 초기화
<ProfileForm key={userId} userId={userId} />
```

effect로 리셋하면 "리셋하는 렌더"가 한 번 더 돈다. `key`는 React의 재조정
단계에서 처리되므로 그 여분의 렌더가 없다.

### Day 1과 같은 교훈

Day 1 장바구니에서 "총액을 `useState`로 두지 마라, 렌더 중 계산해라" 했던 것 —
그건 `useState` 버전의 실수였고, 이건 `useEffect` 버전의 같은 실수다.

> **파생하라, 동기화하지 마라 (derive, don't sync).**

---

## 배운 것

1. 디바운스 = 타이머를 걸고, 클린업에서 이전 타이머를 취소. `[input]` 의존.
2. 레이스는 "응답이 순서대로 안 온다"에서 온다. ignore 플래그(간단) 또는
   AbortController(진짜 취소)로 이전 요청의 결과를 무시/취소한다.
3. `catch`의 error는 `unknown`. `AbortError`는 에러가 아니므로 **맨 먼저**
   걸러서 아무 state도 안 건드리고 `return`.
4. `finally`는 `catch`의 `return`을 통과해 실행된다 — abort 가드를 무력화하니
   이 경우엔 `finally`를 쓰지 않는다.
5. effect는 **바깥 세계와 동기화**할 때만. 데이터에서 나오는 데이터는 렌더 중
   계산하거나, prop 변화 시 리셋은 `key`로.

---

#React #useEffect #디바운스 #debounce #레이스컨디션 #raceCondition #AbortController #setTimeout #클린업 #에러핸들링 #YouMightNotNeedAnEffect #파생상태 #커스텀훅 #모던리액트딥다이브 #프론트엔드 #TIL
