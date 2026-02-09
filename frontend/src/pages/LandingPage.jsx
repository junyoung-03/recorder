import React, { useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useInViewOnce } from '../hooks/useInViewOnce';

const featureCards = [
  {
    title: '가계부',
    description: '수입/지출을 달력과 통계로 한 번에 확인하고 전월 대비 변화까지 확인하세요.',
  },
  {
    title: '일정',
    description: '중요한 일정을 달력에서 한눈에 관리하고 다른 기록과 함께 되돌아봅니다.',
  },
  {
    title: '할 일(Todos)',
    description: '월간 카드형 뷰로 이번 달 할 일을 정리하고 완료 상태를 직관적으로 확인합니다.',
  },
  {
    title: '운동 / 몸 기록',
    description: '운동 내역과 몸 변화를 같은 타임라인에 쌓고 사진과 메모로 기록합니다.',
  },
  {
    title: '일기',
    description: '카테고리별로 글을 쓰는 블로그형 일기, 좋아요와 댓글로 소셜하게 사용해 보세요.',
  },
  {
    title: '친구 소셜',
    description: '친구를 맺고 서로의 기록을 구경하며 응원 댓글과 좋아요를 남길 수 있습니다.',
  },
];

const howItWorks = [
  {
    title: '내 생활에 맞춰 카테고리 선택',
    description: '가계부, 일정, 운동, 일기 등 필요한 기능만 골라 시작합니다.',
  },
  {
    title: '하루가 끝날 때 한 번에 기록',
    description: '오늘의 지출, 해야 했던 일, 운동, 느낌 등을 짧게 남깁니다.',
  },
  {
    title: '주/월 단위로 되돌아보기',
    description: '통계와 캘린더로 이번 주·이번 달의 나를 되돌아보고 다음 목표를 세웁니다.',
  },
];

const previewCards = [
  {
    title: '하루의 기록을 모아 보여주는 홈 대시보드',
    caption: '오늘 할 일, 일정, 지출, 운동 기록을 한 번에 확인하세요.',
  },
  {
    title: '이번 달 지출과 카테고리별 통계',
    caption: '가계부 캘린더와 요약 지표로 소비 패턴을 파악합니다.',
  },
  {
    title: '운동·몸 기록을 함께 보는 타임라인',
    caption: '운동 로그와 몸 변화 기록을 한 화면에서 흐름으로 확인합니다.',
  },
  {
    title: '좋아요/댓글이 달리는 일기 화면',
    caption: '친구와 기록을 공유하며 소셜하게 기록을 이어갑니다.',
  },
];

function AnimatedSection({ children, className, ...rest }) {
  const ref = useRef(null);
  const isInView = useInViewOnce(ref);
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      ref={ref}
      {...rest}
      className={className}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

function LandingPage() {
  const reduceMotion = useReducedMotion();
  const previewItems = useMemo(() => {
    const items = [...previewCards];
    const hasExercise = items.some((item) => item.title.includes('운동'));
    if (!hasExercise) {
      items.splice(2, 0, {
        title: '운동·몸 기록을 함께 보는 타임라인',
        caption: '운동 로그와 몸 변화 기록을 한 화면에서 흐름으로 확인합니다.',
      });
    }
    return items;
  }, []);
  const staggerContainer = reduceMotion
    ? undefined
    : {
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      };
  const staggerItem = reduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
      };
  const hoverLift = reduceMotion ? undefined : { y: -6 };
  return (
    <div className="bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              R
            </div>
            <span className="font-semibold text-lg">Recorder</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">기능</a>
            <a href="#preview" className="hover:text-slate-900">화면 미리보기</a>
            <a href="#faq" className="hover:text-slate-900">자주 묻는 질문</a>
            <a href="/login" className="px-3 py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50">
              로그인
            </a>
            <a href="/register" className="btn-primary px-4 py-2 rounded-full text-white">
              시작하기
            </a>
          </nav>
          <a href="/login" className="md:hidden text-sm text-blue-600 font-semibold">
            시작하기
          </a>
        </div>
      </header>

      <AnimatedSection className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
            지금 바로 시작하세요
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-snug">
            <span className="block">하루의 모든 기록을</span>
            <span className="block mt-2">한 화면에서 정리하세요</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Recorder는 가계부, 일정, 할 일, 운동/몸 기록, 일기, 친구 소셜까지
            흩어져 있던 생활 기록을 날짜 중심으로 한 번에 모아 주는 라이프 트래커입니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/register"
              className="btn-primary px-5 py-3 rounded-full text-white transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              시작하기
            </a>
            <a
              href="#preview"
              className="px-5 py-3 rounded-full border border-slate-300 text-slate-700 hover:border-slate-400 transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              화면 먼저 구경하기
            </a>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span>✔ 날짜 중심 기록 관리</span>
            <span>✔ 소셜 공유 지원</span>
            <span>✔ 일상 기록 통합 관리</span>
          </div>
        </div>
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200"
          initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500">오늘, 나의 하루 요약</p>
              <h3 className="text-xl font-semibold">2월 4일 수요일</h3>
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">대시보드</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['오늘 할 일', '오늘 일정', '오늘 지출', '운동 기록'].map((title) => (
              <div key={title} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">{title}</p>
                <p className="text-lg font-semibold mt-2">3건</p>
                <p className="text-xs text-slate-400 mt-1">상세 보기 →</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
            오늘의 일기 메모를 남겨보세요 ✍️
          </div>
        </motion.div>
      </AnimatedSection>

      <AnimatedSection className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 shadow-sm">
          <h2 className="text-3xl font-bold mb-6">당신의 하루 기록, 혹시 이렇게 흩어져 있나요?</h2>
          <ul className="space-y-3 text-slate-600">
            <li>• 가계부는 엑셀, 일정은 캘린더, 할 일은 메모장에 따로 적고 있다</li>
            <li>• 운동/몸 변화, 일기는 기록해도 나중에 다시 보기 어렵다</li>
            <li>• “저번 달에 뭐 했지?” 같은 질문에 쉽게 답을 못 하겠다</li>
          </ul>
          <p className="mt-6 text-slate-700 font-medium">
            Recorder는 날짜를 기준으로 당신의 생활 데이터를 모아 “그때의 나”를 다시 꺼내볼 수 있게 도와줍니다.
          </p>
        </div>
      </AnimatedSection>

      <AnimatedSection id="features" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold">핵심 기능</h2>
            <p className="text-slate-600 mt-2">Recorder가 제공하는 생활 기록의 중심 기능을 확인하세요.</p>
          </div>
        </div>
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial={reduceMotion ? 'visible' : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.2 }}
        >
          {featureCards.map((feature) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
              whileHover={hoverLift}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      <AnimatedSection className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-10 md:p-12 shadow-sm">
          <h2 className="text-3xl font-bold mb-8">Recorder, 이렇게 사용해 보세요</h2>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial={reduceMotion ? 'visible' : 'hidden'}
            whileInView={reduceMotion ? undefined : 'visible'}
            viewport={{ once: true, amount: 0.2 }}
          >
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                variants={staggerItem}
                whileHover={hoverLift}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
              >
                <span className="text-blue-600 text-sm font-semibold">STEP {index + 1}</span>
                <h3 className="text-xl font-semibold mt-3">{step.title}</h3>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="preview" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold">화면 미리보기</h2>
            <p className="text-slate-600 mt-2">실제 앱에서 확인할 수 있는 흐름을 미리 확인하세요.</p>
          </div>
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial={reduceMotion ? 'visible' : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.2 }}
        >
          {previewItems.map((preview) => (
            <motion.div
              key={preview.title}
              variants={staggerItem}
              whileHover={hoverLift}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm w-full hover:shadow-md transition-shadow"
            >
              <div className="h-52 rounded-xl bg-slate-50 border border-slate-200 mb-4 flex flex-col items-center justify-center text-slate-500 text-sm">
                <div className="text-2xl mb-2">🗂️</div>
                <div>아직 기록이 없어요</div>
              </div>
              <h3 className="text-base font-semibold">{preview.title}</h3>
              <p className="text-slate-600 text-xs mt-2">{preview.caption}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatedSection>

      <AnimatedSection className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 md:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-3">지금 바로 시작해 보세요</h2>
            <p className="text-slate-600">
              Recorder는 현재 기능을 빠르게 개선 중입니다. 피드백을 주시면 우선적으로 반영합니다.
            </p>
          </div>
          <a
            href="/register"
            className="btn-primary px-6 py-3 rounded-full text-white transition-transform duration-300 ease-out hover:-translate-y-0.5"
          >
            시작하기
          </a>
        </div>
      </AnimatedSection>

      <AnimatedSection id="faq" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-10">
          <h2 className="text-3xl font-bold mb-6">자주 묻는 질문</h2>
          <div className="space-y-4 text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Q. Recorder는 무료인가요?</p>
              <p className="text-sm mt-1">네, 현재 베타 기간 동안 모든 기능을 무료로 제공합니다.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Q. 기록은 어떻게 보호되나요?</p>
              <p className="text-sm mt-1">모든 기록은 안전하게 저장되며, 공개 범위는 사용자가 선택할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <footer className="border-t border-slate-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>Recorder · 만든이 junyoung-03</span>
          <div className="flex gap-4">
            <a href="mailto:hello@recorder.app" className="hover:text-slate-700">hello@recorder.app</a>
            <a href="https://github.com" className="hover:text-slate-700">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;


