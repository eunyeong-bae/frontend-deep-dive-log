# 모던 리액트 딥다이브 실습 (3) — React Testing Library 첫 걸음

장바구니 컴포넌트에 테스트 8개를 붙였다. 테스트 코드가 낯설어서 헤맨 지점들을 정리.

## 왜 처음부터 테스트를

리팩터를 많이 할 텐데, 테스트가 없으면 "고쳤는데 딴 게 깨졌나?"를 매번 손으로
확인해야 한다. 테스트가 있으면 **동작 계약**을 고정해두고 구현을 마음껏 바꿀 수 있다.

## RTL의 철학: 구현이 아니라 동작

> "테스트가 소프트웨어 사용 방식과 닮을수록 신뢰도가 높다"

테스트는 사용자가 하는 것만 한다 — 렌더하고, 버튼을 클릭하고, 화면에 보이는
결과를 확인한다. **컴포넌트 내부 함수(`addToCart` 등)에 직접 접근하지 않는다.**

함수 이름, `useState` vs `useReducer`, 상태를 배열로 들었는지 `Record`로 들었는지 -
전부 구현 세부사항이다. 테스트가 이걸 알면, 나중에 리팩터할 때 테스트가 깨진다.
테스트가 지켜야 하는 건 "담기를 누르면 장바구니에 담긴다"라는 동작이다.

> 예외: 순수 유틸 함수(`loadCart` 등)나 커스텀 훅(`renderHook`)은 떼어내서 직접
> 테스트해도 된다. reducer도 `(state, action) => newState` 순수 함수라 UI 없이
> 테스트하는 게 자연스럽다. 컴포넌트는 항상 UI를 통해서.

## getByText가 여러 개 잡힐 때 — within()과 랜드마크

`담기`를 누르면 화면에 `아메리카노`가 두 군데 생긴다 — 상품 목록(`<h3>`)과
장바구니(`<p>`). `screen.getByText('아메리카노')`는 매치가 2개 이상이면
**일부러 throw**한다.

해결: **검색 범위를 좁힌다.** 장바구니를 이름 있는 영역(landmark)으로 만든다.

```tsx
<section aria-labelledby="cart-heading">
  <h2 id="cart-heading">장바구니</h2>
  ...
</section>
```

- `<section>` + `aria-labelledby`(또는 `aria-label`) 조합이면 `region` 랜드마크로 노출된다.
- `<section>`만 있고 이름이 없으면 랜드마크로 안 잡힌다. 이름 필수.

```tsx
import { render, screen, within } from '@testing-library/react'

const cart = screen.getByRole('region', { name: '장바구니' })
expect(within(cart).getByText('아메리카노')).toBeInTheDocument()
```

`within(element)`는 이후 쿼리를 그 하위 트리로만 한정한다. **테스트하기 좋은
마크업 = 접근성 좋은 마크업**이라는 걸 처음 체감했다.

## getBy vs queryBy vs findBy

| 접두사 | 못 찾으면 | 용도 |
|---|---|---|
| `getBy` | throw | 존재를 단언할 때 |
| `queryBy` | `null` 반환 | **부재**를 단언할 때 (`.not.toBeInTheDocument()`) |
| `findBy` | Promise reject (기본 1초 재시도) | 비동기로 나타날 요소 |

"수량 1에서 `-`를 누르면 항목이 사라진다"를 검증할 때:

```tsx
await user.click(within(cart).getByRole('button', { name: '-' }))
expect(within(cart).queryByText('아메리카노')).not.toBeInTheDocument()
```

`getBy`로는 "없음"을 확인할 수 없다 (없으면 throw라 테스트가 거기서 죽는다).

## 좋은 테스트: 알려진 입력 → 기대 출력

"총 금액이 맞는지" 테스트를 처음엔 이렇게 접근했다: 가격 태그들을 다 찾아서
합을 구하고, 총액 태그와 비교한다. → 너무 복잡했고 잘 안 됐다.

올바른 방법: **알려진 입력을 넣고 기대값을 하드코딩한다.**

```tsx
await user.click(addButtons[0]) // 아메리카노 4500
await user.click(addButtons[0]) // x2
await user.click(addButtons[1]) // 카페라떼 5000

expect(within(cart).getByText('총 수량: 3')).toBeInTheDocument()
expect(within(cart).getByText('총 금액: 14000원')).toBeInTheDocument() // 4500*2 + 5000
```

테스트 안에서 결과를 다시 계산하면, 그 계산 로직이 틀렸을 때 테스트도 같이 틀린다.

## 약한 테스트 vs 회귀를 잡는 테스트

"항목 제거"를 처음엔 `총 수량: 0`으로만 확인했다. 문제: 총 수량 `<p>`는
`lines.map` 바깥이라 장바구니가 비어도 항상 렌더된다. 누가 `changeQty`의
`.filter((line) => line.quantity > 0)`를 지워서 **수량 0짜리 항목이 안 지워지는
버그**가 생겨도, 총 수량은 `0 * price = 0`이라 테스트는 그대로 통과한다.

"제거됐다"를 진짜로 검증하려면 **줄 자체가 사라졌는지**를 봐야 한다.

```tsx
expect(within(cart).queryByText('아메리카노')).not.toBeInTheDocument()
expect(within(cart).queryByRole('button', { name: '-' })).not.toBeInTheDocument()
```

> 자문: "이 테스트는 기능이 회귀했을 때 실패하는가?"

## 요소 참조를 상호작용 사이에 들고 있지 말 것

```tsx
const increaseBtn = screen.getByRole('button', { name: '+' })
await user.click(increaseBtn)
// ... 리렌더 발생 ...
await user.click(increaseBtn) // 낡은 참조일 수 있음
```

`screen.getByRole(...)`는 호출할 때마다 현재 DOM을 다시 조회한다. **쓰기 직전에
다시 쿼리**하는 게 안전하다.

```tsx
await user.click(within(cart).getByRole('button', { name: '+' }))
```

## 테스트 격리

jsdom의 `localStorage`는 테스트 파일 안에서 공유된다. 안 지우면 앞 테스트가
저장한 장바구니가 다음 테스트로 샌다.

```ts
// src/setupTests.ts
afterEach(() => {
  cleanup()
  localStorage.clear()
})
```

localStorage 복원 테스트는 이 격리 덕분에 깨끗한 상태에서 시작할 수 있다.

```tsx
test('localStorage에 저장된 장바구니가 첫 렌더에서 복원된다', () => {
  localStorage.setItem('cart', JSON.stringify([{ id: 'p1', quantity: 2 }]))
  render(<Cart />) // async 불필요 — 상호작용 없음

  const cart = screen.getByRole('region', { name: '장바구니' })
  expect(within(cart).getByText('아메리카노')).toBeInTheDocument()
  expect(within(cart).getByText('수량: 2')).toBeInTheDocument()
})
```

이게 `useState(loadCart)`(게으른 초기화)의 존재 이유다 — 첫 렌더에 이미 복원돼
있어야 한다.

## 배운 것

1. 동작을 테스트한다. 구현(함수 이름, 상태 구조)은 건드리지 않는다.
2. 범위를 좁혀라. 랜드마크 + `within()`.
3. 부재는 `queryBy`, 존재는 `getBy`.
4. 알려진 입력 → 기대값 하드코딩. 테스트 안에서 재계산하지 않는다.
5. "이 테스트가 회귀를 잡는가?"를 항상 자문.

## 다음

Day 2 — `useEffect`. 의존성 배열, 클린업, race condition, "이 effect가 사실
필요 없는 경우"를 정면으로 다룬다.

---

#React #테스트 #ReactTestingLibrary #Vitest #jsdom #프론트엔드테스트 #getByRole #within #queryBy #웹접근성 #모던리액트딥다이브 #프론트엔드 #TIL
