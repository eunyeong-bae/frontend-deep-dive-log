# 모던 리액트 딥다이브 실습 (6) — 비동기 React 테스트, 그리고 event loop에서 막힌 이야기

Day 2 `useEffect` 검색 컴포넌트에 테스트를 붙이는 차례였다. 결론부터 말하면
**비동기 + 타이머 테스트가 확 어려웠고**, 절반은 코드를 따라 치면서 이해하려고
했다. 이 글은 그 솔직한 기록.

---

## fake timer부터 꺼냈다가 막힘

디바운스가 300ms `setTimeout`을 쓰니까, 처음엔 "시간을 내가 제어해야지" 하고
`vi.useFakeTimers()`로 갔다. 그런데:

```tsx
beforeEach(() => {
  vi.useFakeTimers()
  searchSpy = vi.spyOn(fakeApi, 'searchUsers')
})

test('타이핑하면 매칭 유저가 나타난다', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<UserSearch />)
  await user.type(screen.getByRole('textbox'), 'ali')  // ← 여기서 5초 뒤 timeout
  // ...
})
```

`await user.type`이 끝나질 않았다. `userEvent`가 내부적으로 타이머를 쓰는데
fake timer랑 엉켜서 데드락. `advanceTimers` 옵션을 줘도 안정적으로 안 돌았다.

### 배운 것: fake timer는 최후의 수단

이 테스트는 사실 fake timer가 **필요 없다.** "결과가 결국 화면에 나타난다"만
보면 되니까, 그냥 실제 시간을 조금 기다리면 된다.

```tsx
beforeEach(() => {
  searchSpy = vi.spyOn(fakeApi, 'searchUsers')  // fake timer 안 씀
})

test('타이핑하면 매칭 유저가 나타난다', async () => {
  searchSpy.mockResolvedValue([{ id: 1, name: 'Alice Kim', email: 'a@e.com' }])
  const user = userEvent.setup()
  render(<UserSearch />)

  await user.type(screen.getByRole('textbox'), 'ali')

  expect(await screen.findByText(/Alice Kim/)).toBeInTheDocument()
})
```

- 디바운스가 300ms뿐이라 실제로 기다려도 순식간
- `findBy*` = "없으면 잠깐 기다렸다 다시 확인" (기본 1초까지 재시도) → 300ms 디바운스는 문제없음
- `getByText`가 아니라 정규식 `/Alice Kim/` — `<li>` 실제 텍스트는 `"Alice Kim — a@e.com"`이라 부분 매칭 필요

fake timer가 진짜 필요한 경우는 "정확히 X ms 후에 **아무 일도 안 일어났다**"를
기다리지 않고 단언하거나, race 순서를 결정론적으로 제어할 때. 그 외엔 real timer.

---

## 통과한 테스트 3개

```tsx
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 2) 빈 입력이면 호출 안 함
test('빈 입력이면 searchUsers를 호출하지 않는다', async () => {
  const user = userEvent.setup()
  render(<UserSearch />)

  await user.type(screen.getByRole('textbox'), 'a')
  await user.clear(screen.getByRole('textbox'))  // 300ms 전에 지움 → effect 클린업이 타이머 취소
  await wait(350)

  expect(searchSpy).not.toHaveBeenCalled()
})

// 3) 빠르게 여러 글자 → 마지막 1회만
test('빠르게 여러 글자를 입력해도 마지막 1회만 호출된다', async () => {
  searchSpy.mockResolvedValue([])
  const user = userEvent.setup()
  render(<UserSearch />)

  await user.type(screen.getByRole('textbox'), 'alice')  // 5글자, 300ms 안에 끝남
  await wait(350)

  expect(searchSpy).toHaveBeenCalledTimes(1)
  expect(searchSpy).toHaveBeenCalledWith('alice', expect.anything())
})
```

race 테스트와 언마운트 테스트(4·5)는 fake timer / 결정론적 제어가 필요해서
**"나중에"로 미뤘다.** 지금 무리하게 따라 치는 건 안 남는다고 판단.

---

## 왜 어려웠나 — event loop 모델이 부족했다

`advanceTimersByTimeAsync`가 왜 필요한지, 왜 `act`로 감싸는지 — 전부
**JavaScript 비동기 실행 순서**를 알아야 이해된다. 여기서 막혔던 거라 따로 정리.

### 정리

- JS는 싱글 스레드 (콜스택 1개).
- `setTimeout(cb, 1000)` 호출 자체는 **동기 함수**. 호스트(Web API)에 타이머를
  등록만 하고 즉시 반환, 콜스택에서 빠진다. **1초가 지나면 그때 호스트가** `cb`를
  매크로태스크 큐에 넣는다. ("옮긴다"가 아니라 "등록 → 나중에 호스트가 넣어줌")
- 비동기 **작업 자체**(네트워크, 타이머 카운트다운, 파일 IO)는 브라우저/OS의
  다른 스레드가 처리한다. 끝나면 콜백을 큐에 넣어줄 뿐, 큐에서 꺼내 실행하는 건
  여전히 메인 스레드(event loop).
- `Promise.then` / `await` 뒷부분은 **마이크로태스크 큐**로 들어간다.
- event loop 규칙: 콜스택 비움 → **마이크로태스크 큐를 완전히 비움**(그 사이
  추가된 것까지) → 매크로태스크 큐에서 1개 실행 → 다시 마이크로태스크 전부 비움
  → … 반복. 그래서 `Promise.then`이 항상 `setTimeout(0)`보다 먼저 돈다.

### 테스트와의 연결

fake timer를 쓰면 `setTimeout`이 호스트로 안 가고, `vi.advanceTimersByTime`으로
내가 직접 발화시켜야 한다. 그런데 디바운스 콜백 안에 `await searchUsers(...)`가
있으니 **타이머를 전진시킨 뒤 마이크로태스크(= await 뒷부분)까지 flush**해야
`setUsers`가 돈다. 그게 `advanceTimersByTimeAsync`. 그리고 그 사이 일어나는
React 상태 변경을 `act(async () => ...)`로 감싸야 "act 경고"가 안 뜬다.

→ 이 모델이 손에 익으면 4·5번도 다시 볼 수 있다. 지금은 real timer 3개로 충분.

---

## 배운 것

1. **fake timer는 기본값이 아니라 최후의 수단.** 대부분은 real timer + `findBy` +
   짧은 `wait`로 된다.
2. `findBy*` = 비동기로 나타나는 요소용. `getBy`(즉시) / `queryBy`(부재) 와 구분.
3. `userEvent`는 타이핑이 빠르다(< 300ms) → 디바운스가 자연히 하나로 합쳐진다.
4. 비동기 테스트가 어렵게 느껴지면 대개 **event loop 모델**이 빈 것. 그건 따로
   공부할 가치가 있는 토픽.
5. 5단계 위 코드를 따라 치는 건 근육이 안 붙는다. 되는 난이도까지 내려서
   리듬을 회복하는 게 낫다.

## 다음

Day 3 — `useMemo` / `useCallback`. 비동기 없이 "참조 동일성" 한 가지에 집중.

---

#React #테스트 #ReactTestingLibrary #Vitest #비동기 #eventLoop #이벤트루프 #마이크로태스크 #fakeTimers #findBy #디바운스 #TIL회고 #모던리액트딥다이브 #프론트엔드 #TIL
