# 모던 리액트 딥다이브 실습 (1) — 개발 환경, 왜 이렇게 골랐나

## 이 시리즈에 대해

휴직 8개월차. 『모던 리액트 딥다이브』를 읽으며 이론은 따로 정리하고 있는데,
눈으로 읽는 것만으로는 실무 감각이 안 돌아온다. 그래서 개념마다 작은 문제를
직접 구현하고 → 리뷰받고 → 같이 리팩터하는 루프를 매일 돌리기로 했다.
이 글은 그 첫날, 연습용 저장소 환경을 세팅하면서 "왜 이걸 쓰는가"를 정리한 것.

최종 스택: **pnpm + Vite + React + TypeScript + Vitest + React Testing Library**

---

## 패키지 매니저: npm이 아니라 pnpm

공식 문서는 대부분 `npm`으로 예제를 주지만, 채용 공고를 보면 `pnpm`이나 `yarn`을
쓰는 곳이 많다. 차이를 정리해봤다.

| | npm | yarn (classic) | pnpm |
|---|---|---|---|
| 설치 | Node 기본 포함 | 별도 | 별도 |
| 속도 | 느린 편 | 빠름 | 가장 빠름 |
| 디스크 | 프로젝트마다 `node_modules` 전체 복사 | 동일 | 전역 저장소 1벌 + hard link로 공유 |
| 의존성 격리 | 느슨 (phantom dependency 허용) | 느슨 | 엄격 |

**phantom dependency**: A가 B를 의존하고 B가 lodash를 의존할 때, npm/yarn에서는
내 코드가 `import 'lodash'`를 해도 우연히 동작한다. B가 lodash를 빼는 순간 깨진다.
pnpm은 `package.json`에 직접 선언하지 않은 패키지의 import를 막는다.

**공고에 pnpm/yarn이 많은 이유**
- 모노레포: 앱 여러 개 + 공용 패키지를 한 저장소에 둘 때 설치 속도·디스크가 실제 비용이 된다. pnpm workspace가 사실상 표준.
- CI 속도: 매 커밋마다 `install`이 도는데 pnpm 캐시가 빠르다.
- 엄격함: 큰 팀일수록 "우연히 동작하는" 의존성이 사고로 이어진다.
- yarn을 쓰는 곳은 대부분 yarn 1 시절부터 lockfile을 커밋해둔 레거시. yarn 1은 유지보수 모드라 신규 채택은 거의 pnpm.

학습용 단일 저장소는 뭘 써도 결과가 같지만, 실무 감각이 목적이라 습관을 pnpm으로 들이기로 했다.

---

## 빌드 도구: 왜 Vite

CRA(Create React App)는 사실상 폐기됐다. React 공식 문서도 더는 권장하지 않고,
순수 SPA는 [Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)
에서 Vite를 첫 번째로 추천한다.

- dev 서버는 esbuild, 프로덕션 빌드는 Rollup 기반이라 빠르다.
- 설정 파일이 얇아서 직접 만질 여지가 많다 (Vitest 붙이기도 쉬움).
- HTML이 최상위 진입점이다. `index.html` 안의 `<script type="module" src="/src/main.tsx">`를 기점으로 번들링한다.

### `pnpm create vite@latest` 의 의미

`pnpm create vite`는 내부적으로 `create-vite`라는 npm 패키지를 받아서 실행하는
축약형이다 (`pnpm dlx create-vite`와 같음). `@latest`를 붙이면 "캐시된 옛날 버전
쓰지 말고 최신을 받아라"는 뜻. 예전에 한 번 실행해서 캐시가 남아 있으면 구버전이
돌 수 있으니 명시적으로 붙이는 게 안전하다.

```bash
pnpm create vite@latest . --template react-ts
```

- `.` = 새 폴더 만들지 말고 현재 폴더에 생성
- `--template react-ts` = React + TypeScript 최소 구성
- pnpm/yarn은 인자를 바로 전달. **npm만** `npm create vite@latest . -- --template react-ts`처럼 `--` 구분자가 필요하다 (npm이 뒤 플래그를 create-vite로 넘기라는 표시)

---

## 왜 Vitest (Jest 아니고)

Jest도 되지만, 이미 `vite.config.ts`가 있으니 **Vitest가 그 설정(플러그인, 경로
별칭)을 그대로 재사용**한다. 설정 중복이 없고 ESM/TS를 기본 지원한다. API는
Jest와 거의 동일(`describe` / `it` / `expect`).

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',      // Node에 브라우저 DOM(document, window) 흉내
    globals: true,             // describe/it/expect를 import 없이 사용
    setupFiles: ['./src/setupTests.ts'],
    css: false,                // 테스트에서 CSS import 무시 (속도)
  },
})
```

```ts
// src/setupTests.ts — 각 테스트 파일 실행 전에 돈다
import '@testing-library/jest-dom/vitest' // toBeInTheDocument 같은 matcher 등록
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()            // 렌더된 컴포넌트 언마운트 → 테스트 간 오염 방지
  localStorage.clear() // jsdom localStorage는 테스트끼리 공유되므로 초기화
})
```

`globals: true`로 쓴 `expect` 등이 타입 에러가 안 나게 `tsconfig.app.json`에도 추가한다.

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
```

---

## tsconfig가 3개로 쪼개진 이유

create-vite가 만들어준 파일이 3개다.

- `tsconfig.json` — 루트. 자기 설정은 없고 아래 둘을 `references`로 묶기만 함 (project references 구조)
- `tsconfig.app.json` — `src/`의 **앱 코드용**. 브라우저 환경 → `lib: ["DOM"]`, `moduleResolution: "bundler"`, JSX 설정
- `tsconfig.node.json` — `vite.config.ts` 같은 **빌드 도구 코드용**. Node 환경 → Node 전역/타입

앱 코드와 빌드 스크립트는 실행 환경(브라우저 vs Node)이 다르고 사용 가능한 전역도
다르다. 그래서 설정을 분리한다. `pnpm build`는 `tsc -b`(references 순회하며 타입체크)
→ `vite build`(번들) 순. 타입 에러가 나면 빌드가 실패한다.

---

## 셋업 순서

1. **GitHub에 빈 저장소 생성** (README·.gitignore·license 체크 안 함 — 로컬에서 만들 거라 충돌 방지)
2. 로컬 폴더 만들고 `git init`
3. **커밋 신원 확인** — `git config user.email`이 GitHub에 등록된 이메일이어야 잔디에 찍힌다. 이메일 노출이 싫으면 `12345+username@users.noreply.github.com` 형식 사용
4. `README.md` + `.gitignore` 작성 → 첫 커밋
5. `git remote add origin ...` → `git push -u origin main`
6. **현재 폴더에 Vite 스캐폴드** (`pnpm create vite@latest . --template react-ts`, "Ignore files and continue" 선택)
7. Vitest + RTL 설치, 설정 파일 작성
8. **스모크 테스트 1개**로 파이프라인 검증 후 삭제

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/dom \
  @testing-library/user-event @testing-library/jest-dom
```

---

## 삽질 기록

- **create-vite가 내 `README.md`를 템플릿 보일러플레이트로 덮어썼다.** 이미 커밋해둬서 `git checkout README.md`로 복구. 비어있지 않은 폴더에 스캐폴드할 때 "Ignore files and continue"를 골라도 동명 파일은 덮어쓴다.
- **`git add README.md`에서 `pathspec did not match`** — 파일을 아직 안 만들었기 때문. `git add`는 존재하는 파일만 스테이징한다.
- 처음엔 스캐폴드 명령을 어디서 찾는지 몰라 헤맸다. 정답은 [Vite 공식 가이드의 Scaffolding 섹션](https://vite.dev/guide/#scaffolding-your-first-vite-project). 패키지 매니저별 탭이 나뉘어 있다.

---

## 다음

Post 2 — `useState`로 장바구니를 만들면서 "상태를 어떻게 나눌 것인가"를 정리한다.

---

#pnpm #npm #yarn #Vite #Vitest #React #TypeScript #tsconfig #개발환경셋업 #패키지매니저 #모던리액트딥다이브 #프론트엔드 #TIL
