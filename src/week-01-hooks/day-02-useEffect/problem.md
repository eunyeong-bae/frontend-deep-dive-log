## 요구사항 — 기본 (필수)
검색 입력창(<input>). 입력값을 state로 관리
useEffect로 검색어 변화에 반응해 searchUsers(query) 호출, 결과를 목록으로 렌더 (이름 + 이메일)
의존성 배열을 정확히 — 무엇이 들어가야 하는지, 왜 그것뿐인지 회고에 적기
검색어가 빈 문자열이면 API를 호출하지 않고 결과를 비운다
로딩 표시("검색 중…"). 결과가 오면 사라짐

## 요구사항 — 응용
디바운스 300ms — 마지막 입력 후 300ms가 지나야 호출. setTimeout + 클린업의 clearTimeout
race condition 처리 — 느린 응답이 빠른(더 최근) 응답을 덮어쓰지 않게. 클린업에서 ignore 플래그를 세우거나 AbortController로 취소
에러 상태 — 검색어에 err가 들어가면 searchUsers가 reject. 에러 메시지를 보여주고, AbortError는 에러로 취급하지 않기
결과 개수 표시("N명"). 이건 결과 배열에서 파생 — 별도 state 금지

## 요구사항 — 도전
"이 effect는 필요 없다" — 아래 3개 컴포넌트가 왜 useEffect를 쓸 필요가 없는지 각각 설명하고 effect 없이 다시 작성 (bad-effects.tsx로):
(a) props.users를 effect에서 필터링해 filteredUsers state에 저장
(b) firstName, lastName state를 effect에서 합쳐 fullName state로 만듦
(c) props.userId가 바뀔 때 effect에서 폼 입력 state를 ''로 리셋
디바운스를 useDebouncedValue(value, delay) 커스텀 훅으로 분리
fake timer(vi.useFakeTimers())로 디바운스/레이스 테스트를 결정론적으로 작성

## 테스트 (처음부터) — UserSearch.test.tsx
타이핑하면 매칭되는 유저가 나타난다 (findByText)
빈 입력이면 searchUsers가 호출되지 않는다 (vi.spyOn/vi.fn)
디바운스: 빠르게 여러 글자를 입력해도 호출은 마지막 1회 (spy 호출 횟수)
race: 느린 요청(latency 크게) 후 빠른 요청 → 화면엔 최신 결과만
언마운트 후 응답이 도착해도 act 경고/에러가 없다

searchUsers를 테스트에서 어떻게 가짜로 바꿀지(vi.mock vs 인자 주입)부터 고민하게 될 거예요. 막히면 그 지점에서 가져와요.

## 제약
파생값(결과 개수 등)에 별도 useState·useEffect 금지
effect 안에 이벤트 핸들러 로직(클릭 처리 등) 넣지 말 것
fakeApi.ts는 주어진 대로 사용
커밋은 기능 단위 (feat(day-02): ..., test(day-02): ..., fix(day-02): ...)