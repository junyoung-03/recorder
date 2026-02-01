import React from 'react';
import '../styles/global.css';

const navLinks = [
  { href: '/', label: '홈' },
  { href: '/schedule', label: '일정' },
  { href: '/finance', label: '가계부' },
  { href: '/exercise', label: '운동' },
  { href: '/journal', label: '일기' },
  { href: '/friends', label: '친구' },
];

function BaseLayout({ children, currentUser, activePath = '/' }) {
  const isActive = (path) => activePath === path;

  return (
    <div style={{ backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      <nav className="navy-bg shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Recorder (리코더)</h1>
            <div className="flex items-center gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md transition ${
                    isActive(link.href)
                      ? 'calm-blue-bg text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="w-px h-6 bg-gray-600 mx-1" />
              {currentUser?.isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-200 px-2">
                    {currentUser.nickname || currentUser.username}
                  </span>
                  <a
                    href="/logout"
                    className="px-3 py-1.5 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition"
                  >
                    로그아웃
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className={`px-3 py-1.5 rounded-md transition ${
                      isActive('/login')
                        ? 'calm-blue-bg text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    로그인
                  </a>
                  <a
                    href="/register"
                    className={`px-3 py-1.5 rounded-md transition ${
                      isActive('/register')
                        ? 'calm-blue-bg text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    회원가입
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default BaseLayout;

