# Recorder 랜딩 페이지 동적 인터랙션 개선 요청 (v2)

## 0. 역할 & 컨텍스트

당신은 React + Vite + Tailwind 기반의 앱 **Recorder**를 개선하는 시니어 프론트엔드 개발자입니다.  
이미 구현된 랜딩 페이지(`/`)의 레이아웃/카피는 그대로 유지하면서, **과하지 않지만 살아있는 느낌의 동적 인터랙션**을 추가하는 것이 목표입니다.

- 스택: React, Vite, TypeScript, TailwindCSS (현재 설정 유지)
- 주요 라우트: `/` 가 공개 랜딩
- 랜딩 섹션 구조(이미 구현됨):
  1. 상단 네비게이션
  2. Hero
  3. 문제 공감 섹션
  4. 핵심 기능(6개 카드)
  5. 사용 흐름 (STEP 1~3)
  6. 화면 미리보기
  7. CTA
  8. FAQ

> 중요: 레이아웃과 텍스트 구조는 최대한 유지하고, **애니메이션과 인터랙션 중심으로만 변경**합니다.  
> 디자인은 현재 스타일 가이드를 따르되, 약간의 여백/정렬 보정 정도는 허용됩니다.

---

## 1. 공통 규칙

1. **Tailwind 유틸리티 우선**
   - 가능하면 Tailwind 클래스만 사용하여 애니메이션/트랜지션을 구현합니다.
   - 꼭 필요한 경우에만 최소 범위의 CSS(예: `@layer components`)를 추가합니다.

2. **애니메이션 라이브러리 사용 정책**
   - `framer-motion` 사용을 우선 검토합니다.
   - 설치가 안 되어 있으면:
     - `npm install framer-motion`
   - 단순 호버/트랜지션은 Tailwind만으로 처리합니다.

3. **퍼포먼스 & 접근성**
   - 애니메이션은 짧게(0.3~0.6s), `ease-out` 계열 사용.
   - `prefers-reduced-motion` 환경에서는 애니메이션 강도를 낮추거나 비활성화합니다.
   - 인터랙션이 있는 요소에는 `aria-label`, `role`, `button` 태그 등을 적절히 사용합니다.

---

## 2. 구조 찾기 및 리팩터링 준비

1. 랜딩 페이지 컴포넌트 파일을 찾습니다.
   - `"하루의 모든 기록을 한 화면에서 정리하세요"` 텍스트로 검색하여 해당 컴포넌트를 찾으세요.
2. 해당 파일의 주요 섹션을 의미 있는 **서브 컴포넌트**로 분리합니다. (이미 분리되어 있다면 재사용)
   - 예시:
     - `LandingHero`
     - `LandingProblemSection`
     - `LandingFeatures`
     - `LandingHowItWorks`
     - `LandingPreview`
     - `LandingCTA`
     - `LandingFAQ`
3. 각 섹션 컴포넌트의 **루트 요소**를 기준으로 스크롤 애니메이션을 적용합니다.

---

## 3. 공통: 섹션 스크롤 애니메이션

### 3.1 useInViewOnce 훅 만들기

1. `src/hooks/useInViewOnce.ts` 파일을 생성합니다.
2. IntersectionObserver 또는 `framer-motion`의 `useInView`를 사용해, **한 번만** 애니메이션이 실행되는 in-view 상태를 반환하는 훅을 만듭니다.

```ts
// 예시 구조 (구현은 자유)
export function useInViewOnce(ref: React.RefObject<HTMLElement>) {
  // isInView: boolean 반환
}
```
