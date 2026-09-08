# 모던 리액트 딥다이브 실습 (2) — useState: 상태를 어떻게 나눌 것인가

딥다이브 3.1.1 대응. `useState`를 "쓸 줄 안다"가 아니라 **언제 상태를 나누고,
언제 상태로 두지 않고, 어떻게 갱신하는가**를 손에 익히는 게 목표였다.

## 문제: 미니 장바구니

상품 목록에서 담고, 수량을 조절하고, 합계를 보는 화면 하나. 라우팅·서버·스타일링
없음. 상태 구조와 갱신 방식에만 집중.

```ts
type Product = { id: string; name: string; price: number; stock: number }
```

요구사항 요약: 담기 / 수량 +- (0이면 제거) / 총 수량·총 금액 / 무료배송(3만원)
/ 재고 상한 / localStorage 저장·복원.

---

## 1차 시도의 문제 — 파생값을 상태에 복사했다

처음엔 장바구니 항목을 이렇게 설계했다.

```ts
interface ItemProps {
  name: string          // PRODUCTS에 이미 있는 값
  stock: number         // "담은 수량"인데 이름이 재고(Product.stock)와 충돌
  totalPrice: number    // 파생값! price × 수량으로 항상 계산 가능
  possibleStock: number // Product.stock을 복사해둔 것 → 진실의 원천이 2개
}
```

그 결과 수량을 줄일 때 이런 코드가 나왔다.

```ts
// 단가를 나눗셈으로 역산 → 부동소수점 오차, 취약
const newItem = {
  ...item,
  stock: item.stock - 1,
  totalPrice: item.totalPrice - item.totalPrice / item.stock,
}
```

리뷰에서 지적받은 핵심: **요구사항의 "파생값을 상태로 두지 마라"는 총액에만
해당하는 게 아니다.** 항목별 `totalPrice`도 똑같은 안티패턴이다.

---

## 원칙 1 — 파생 가능한 값은 상태로 두지 않는다

장바구니 항목이 실제로 들고 있어야 하는 정보는 `{ id, quantity }` 둘뿐이다.
이름·단가·재고 상한·소계·총계는 전부 렌더 시점에 계산한다.

```tsx
interface CartItem {
  id: string
  quantity: number
}

const [items, setItems] = useState<CartItem[]>(loadCart)

// 렌더 본문에서 파생 배열을 만든다
const lines = items.map((line) => {
  const product = PRODUCTS.find((p) => p.id === line.id)! // id는 항상 PRODUCTS에서 나옴
  return { ...product, quantity: line.quantity, lineTotal: product.price * line.quantity }
})

const totalCount = items.reduce((sum, line) => sum + line.quantity, 0)
const totalPrice = lines.reduce((sum, line) => sum + line.lineTotal, 0)
```

파생값을 `useState`로 들고 `useEffect`로 원본과 동기화하는 코드를 만드는 순간
버그가 생긴다. 그냥 렌더할 때마다 계산하면 항상 정확하다.

> `useMemo`는? 처음엔 `totalPrice`에 `useMemo`를 걸었는데, 지금은 작은 배열
> `reduce`라 이득이 없다. `useMemo`는 Day 3 주제. 일단 본문 계산으로 통일했다.

---

## 원칙 2 — 최소 상태 + 렌더 시 조합 (정규화)

상품 데이터를 장바구니 상태에 복사하지 않고 **참조(id)만** 두는 것 —
이게 정규화다. 1차 버전(`totalPrice`, `possibleStock`을 항목에 복사)이
비정규화였고, 리팩터하면서 정규화한 셈이다.

도전 과제에 나온 `Record<id, quantity>` 형태는 같은 원칙에 자료구조만 다른 것
(`items[id]`로 O(1) 조회, 중복 항목 구조적으로 불가능). 원리는 같다.

핸들러도 단순해진다.

```tsx
const addToCart = (id: string) => {
  setItems((prev) => {
    const existing = prev.find((i) => i.id === id)
    if (!existing) return [...prev, { id, quantity: 1 }]
    return prev.map((line) =>
      line.id === id ? { ...line, quantity: line.quantity + 1 } : line,
    )
  })
}

const changeQty = (id: string, delta: number) => {
  setItems((prev) =>
    prev
      .map((line) => (line.id === id ? { ...line, quantity: line.quantity + delta } : line))
      .filter((line) => line.quantity > 0), // 0이면 상태에서 제거
  )
}
```

`.map` 다음에 `.filter((line) => line.quantity > 0)` 한 줄로 "수량 0이면 제거"가
공짜로 처리된다. 처음엔 수량 0인 항목을 상태에 남겨두고 화면에서만 숨겼는데,
그러면 총계 계산이 부정확해진다.

---

## 원칙 3 — 함수형 업데이트, 언제 왜

```tsx
setItems((prev) => ...) // 함수형
setItems(newArray)      // 값
```

**리렌더를 예약하는 건 setter 호출 자체다.** 값을 넘기든 함수를 넘기든 똑같이
리렌더한다. 함수형의 고유한 이점은 따로 있다:

> `setState`에 넘긴 함수는 "예약된 시점 기준 최신 state"를 인자로 받는다.

한 이벤트 핸들러에서 여러 번 갱신하거나, 비동기 콜백(`setTimeout`, `await` 이후)에서
갱신할 때 — 렌더 클로저에 갇힌 낡은 값이 아니라 최신 값으로 계산된다.

```tsx
const [n, setN] = useState(0)
function handleClick() {
  setN(n + 1) // n은 이 렌더 내내 0 → 0 + 1
  setN(n + 1) // 여전히 0 + 1
  setN(n + 1) // 여전히 0 + 1 → 최종 1

  setN((prev) => prev + 1) // 앞 결과를 받음
  setN((prev) => prev + 1) // → 누적됨
}
```

"기존 배열 → 새 배열"인 `addToCart`, `changeQty`는 이전 상태에 의존하므로 항상 함수형.

---

## 게으른 초기화 — 문법만 흉내내면 소용없다

localStorage 복원을 처음엔 이렇게 썼다.

```tsx
useState<CartItem[]>(loadCart()) // ❌ 매 렌더마다 loadCart() 실행 → localStorage 읽기 + JSON.parse
```

`useState`의 인자로 **값**을 넘기면, 그 값을 만드는 표현식은 매 렌더 평가된다
(첫 렌더 이후 결과는 버려지지만 연산은 일어난다). 초기값 계산이 비싸면(파일 파싱 등)
**함수를 넘긴다.** 그 함수는 첫 렌더에만 호출된다.

```tsx
useState<CartItem[]>(loadCart) // ✅ 함수 "참조"를 넘김 → React가 첫 렌더에만 호출
```

```tsx
const STORAGE_KEY = 'cart'
function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return [] // 손상된 JSON 방어
  }
}
```

처음 작성한 코드는 `else` 분기에서 `localStorage.setItem(...)`을 호출했는데,
이 메서드는 `undefined`를 반환한다. 그래서 초기 상태가 `undefined`가 되고
이후 `items.map`이 전부 터졌다. 초기화 함수는 **읽어서 반환만** 해야 한다.

---

## 저장: useEffect가 맞는 자리

```tsx
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}, [items])
```

"파생값을 `useEffect`로 만들지 마라"와 모순 아닌가? 아니다. 금지된 건
*다른 state로부터 계산 가능한 값을 `useEffect` + `useState`로 복제*하는 패턴이다.
localStorage 같은 **외부 시스템과의 동기화는 진짜 side effect**라서 `useEffect`가
정확히 맞는 자리다. (나중에 `useLocalStorageState` 커스텀 훅으로 분리할 예정)

---

## UI 가드 vs 불변식

재고 상한을 처음엔 버튼 `disabled`로만 막았다.

```tsx
<button disabled={line.quantity >= line.stock} onClick={() => changeQty(line.id, 1)}>+</button>
```

리뷰 지적: `disabled`는 **UX**를 위한 것이다. "수량 ≤ 재고" 같은 **불변식**이
있다면 **상태 갱신 함수 안에서도** 강제해야 한다. `changeQty`는 버튼 말고
다른 경로(테스트, 다른 컴포넌트, 나중의 "한 번에 5개 담기" 기능)에서도 불릴 수 있다.

```tsx
// changeQty 안에서 clamp
quantity: Math.min(line.quantity + delta, product.stock)
```

---

## 배운 것

1. 파생 가능한 값은 상태로 두지 않는다. `items`만 상태, 나머지는 렌더 시 계산.
2. 최소 상태 + 참조(id)로 조합 = 정규화. 원본 데이터를 상태에 복사하지 않는다.
3. 다음 상태가 이전 상태에 의존하면 함수형 업데이트.
4. 게으른 초기화는 함수 "참조"를 넘겨야 한다. `f()`가 아니라 `f`.
5. 상태 설계를 먼저 하고 코드를 짜자. 오늘은 코드부터 짜서 리팩터 비용이 컸다.

## 다음

Post 3 — 이 장바구니에 React Testing Library로 테스트를 붙이면서 배운 것.

---

#React #useState #리액트훅 #상태관리 #파생상태 #상태정규화 #함수형업데이트 #게으른초기화 #useEffect #불변성 #모던리액트딥다이브 #프론트엔드 #TIL
