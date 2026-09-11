## 요구사항 — 기본 (필수)
1. makeItems(500) 정도의 데이터. 컨트롤: 검색어 입력, 카테고리 필터(전체/A/B/C), 정렬(이름순 / 점수순)
2. 필터+정렬 결과를 <Row item={...} onSelect={...} /> 리스트로 렌더. Row는 React.memo로 감싼다
3. useRenderCount() 커스텀 훅을 만들어 각 Row가 몇 번 렌더됐는지 행에 표시 (useRef로 카운트 증가)
4. 부모에 리스트와 무관한 state 하나 — 예: <button>+1</button> 카운터. 이걸 눌렀을 때 모든 Row의 렌더 카운트가 올라가는 것을 먼저 관찰 (아직 최적화 전)
5. 필터+정렬을 useMemo로, Row에 넘기는 onSelect를 useCallback으로 감싼다 → 이제 카운터를 눌러도 Row 렌더 카운트가 안 올라가는 것 확인


## 요구사항 — 응용
1. 필터 함수 안에 인위적 지연(수 ms 바쁜 루프)을 넣고, useMemo 없이 / 있이 각각 카운터를 눌러보며 "필터 계산이 다시 도는지"를 console.time 또는 카운터로 측정. before/after를 회고에 숫자로
2. Row에 인라인 style={{ padding: 8 }}를 넘겨보고 → React.memo가 깨지는 것(매 렌더 리렌더) 확인 → useMemo로 style 객체를 안정화하거나 컴포넌트 밖 상수로 빼서 해결
3. 선택된 id를 Set<number>로 관리. Row엔 Set을 통째로 넘기지 말고 isSelected: boolean만 넘긴다 (Set은 갱신마다 새 참조 → 넘기면 memo 깨짐)

## 요구사항 — 도전
1. "메모이제이션이 필요 없는 곳" — 아래 3개가 왜 불필요/무의미한지 설명하고 걷어내기 (bad-memo.tsx로):
(a) const doubled = useMemo(() => count * 2, [count]) — 원시값의 사소한 계산
(b) useCallback으로 감쌌지만 React.memo 안 된 자식에게 넘기거나, 아무 데도 안 넘기는 핸들러
(c) useMemo(() => ({ ...obj }), [obj]) 처럼 deps에 매 렌더 새로 만들어지는 객체가 들어가서 사실상 매번 재계산
2. React.memo의 2번째 인자(커스텀 비교 함수)를 써보고, 왜 대부분 안티패턴인지 

## 테스트 — List.test.tsx
- 검색어를 입력하면 결과 개수가 줄어든다
- 정렬 토글이 순서를 바꾼다 (첫 행 텍스트 비교)
- 무관한 카운터를 눌러도 Row가 리렌더되지 않는다 — React.Profiler의 onRender 콜백을 vi.fn()으로 받아 호출 횟수 검증, 또는 Row 렌더 카운트를 화면 텍스트로 읽어 비교
- (도전) useCallback을 제거하면 위 테스트가 깨지는지 확인 → 회귀를 잡는 테스트인지 검증

## 제약
- React.memo / useMemo / useCallback 먼저 없이 만들어서 문제를 관찰한 뒤 적용 (before를 봐야 after가 의미 있음)
- 측정 없이 "빨라졌겠지"는 금지 — 렌더 카운트나 console.time 숫자로
커밋 단위 쪼개기 (feat → perf → test)