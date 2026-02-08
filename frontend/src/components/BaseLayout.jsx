import React from 'react';
import '../styles/global.css';
import { supabase } from '../lib/supabaseClient';
import { navigate } from '../lib/navigation';
import { canNavigateFromFriend, getFriendContext, getFriendNavTarget } from '../lib/friendPermissions';

const navLinks = [
  { href: '/dashboard', label: '홈' },
  { href: '/finance', label: '가계부' },
  { href: '/schedule', label: '일정' },
  { href: '/exercise', label: '운동/몸' },
  { href: '/journal', label: '일기' },
  { href: '/friends', label: '친구' },
];

const publicPages = new Set(['landing', 'login', 'register', 'resetPassword']);
const friendPages = new Set(['friendJournal', 'friendExercise', 'friendBody']);

function BaseLayout({ children, currentUser, activePath = '/', page }) {
  const friendContext = getFriendContext(activePath);
  const isActive = (path) => {
    if (!friendContext.isFriendMode) return activePath === path;
    if (!friendContext.friendId) return false;
    if (path === '/exercise') {
      return (
        activePath.startsWith(`/friend/${friendContext.friendId}/exercise`) ||
        activePath.startsWith(`/friend/${friendContext.friendId}/body`)
      );
    }
    if (path === '/journal') return activePath.startsWith(`/friend/${friendContext.friendId}/journal`);
    return false;
  };
  const isAuthenticated = Boolean(currentUser?.isAuthenticated);
  const isPublic = publicPages.has(page);
  const isLanding = page === 'landing';
  const isResetPassword = page === 'resetPassword';
  const isFriendPage = friendPages.has(page) || friendContext.isFriendMode;

  if (isLanding) {
    return <div className="min-h-screen bg-warm">{children}</div>;
  }

  if ((!isAuthenticated && isPublic) || isResetPassword) {
    return (
      <div className="min-h-screen bg-warm">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(isFriendPage ? '/friends' : '/landing')}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                R
              </div>
              <span className="font-semibold text-lg text-slate-900">Recorder</span>
            </button>
            {!isFriendPage && (
              <div className="text-sm text-slate-500">
                이미 계정이 있나요?{' '}
                <a className="text-blue-600 font-semibold" href="/login">
                  로그인
                </a>
              </div>
            )}
            {isFriendPage && (
              <button type="button" onClick={() => navigate('/friends')} className="btn-secondary px-3 py-1.5 text-xs font-semibold">
                친구 페이지로 이동
              </button>
            )}
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-12">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm text-slate-900">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
          <div className="px-6 py-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                R
              </div>
              <div>
                <h1 className="text-lg font-semibold">Recorder</h1>
                <p className="text-xs text-slate-500">Life tracker</p>
              </div>
            </div>
          </div>
          <nav className="px-4 space-y-1">
            {navLinks.map((link) => {
              const navAllowed = !isFriendPage || canNavigateFromFriend(link.href);
              const navTarget = isFriendPage && friendContext.friendId
                ? getFriendNavTarget(link.href, friendContext.friendId)
                : link.href;
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    if (!navAllowed) return;
                    navigate(navTarget);
                  }}
                  disabled={!navAllowed}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : navAllowed
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    isActive(link.href) ? 'bg-white' : navAllowed ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  />
                  {link.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto px-6 py-6 border-t border-slate-200 text-sm text-slate-500">
            {currentUser?.nickname || currentUser?.username} 님
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
              className="block mt-3 text-blue-600 font-semibold"
            >
              로그아웃
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <header className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="lg:hidden w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  R
                </div>
                <div>
                  <p className="text-sm text-slate-500">오늘도 기록하기</p>
                  <h2 className="text-lg font-semibold">Recorder Dashboard</h2>
                </div>
              </div>
            <div className="flex items-center gap-3">
              {friendContext.isFriendMode && (
                <button
                  type="button"
                  onClick={() => navigate('/friends')}
                  className="btn-secondary px-3 py-1.5 text-xs font-semibold"
                >
                  친구 페이지 나가기
                </button>
              )}
              <div className="w-9 h-9 rounded-full bg-slate-200" />
              <span className="text-sm font-medium text-slate-700">
                {currentUser?.nickname || currentUser?.username}
              </span>
              <a href="/account" className="btn-secondary px-3 py-1.5 text-xs font-semibold">
                프로필 관리
              </a>
            </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default BaseLayout;

