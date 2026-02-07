import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MAX_FAILED_ATTEMPTS = 3;

const toAuthEmail = (value) => {
  if (!value) return '';
  return value.includes('@') ? value : `${value}@recorder.local`;
};

const getAttemptKey = (identifier) => `recorder:loginAttempts:${identifier}`;

const getStoredAttempts = (identifier) => {
  if (!identifier) return 0;
  const stored = window.localStorage.getItem(getAttemptKey(identifier));
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : 0;
};

const setStoredAttempts = (identifier, count) => {
  if (!identifier) return;
  window.localStorage.setItem(getAttemptKey(identifier), String(count));
};

const clearStoredAttempts = (identifier) => {
  if (!identifier) return;
  window.localStorage.removeItem(getAttemptKey(identifier));
};

function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resetError, setResetError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const currentIdentifier = useMemo(() => identifier.trim().toLowerCase(), [identifier]);
  const currentEmail = useMemo(() => toAuthEmail(currentIdentifier), [currentIdentifier]);
  const isLocked = failedAttempts >= MAX_FAILED_ATTEMPTS;

  useEffect(() => {
    setFailedAttempts(getStoredAttempts(currentIdentifier));
    setResetError(null);
    setResetSent(false);
  }, [currentIdentifier]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResetError(null);
    setResetSent(false);
    setLoading(true);
    let email = currentEmail;
    if (!currentIdentifier.includes('@')) {
      const { data: userByUsername, error: lookupError } = await supabase
        .from('users')
        .select('email')
        .eq('username', currentIdentifier)
        .maybeSingle();

      if (lookupError) {
        setLoading(false);
        setError('이메일을 확인할 수 없습니다. 이메일로 로그인해주세요.');
        return;
      }

      if (userByUsername?.email) {
        email = userByUsername.email;
      } else {
        const { data: userByNickname } = await supabase
          .from('users')
          .select('email')
          .eq('nickname', currentIdentifier)
          .maybeSingle();
        if (userByNickname?.email) {
          email = userByNickname.email;
        }
      }
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      const nextAttempts = Math.min(getStoredAttempts(currentIdentifier) + 1, MAX_FAILED_ATTEMPTS);
      setStoredAttempts(currentIdentifier, nextAttempts);
      setFailedAttempts(nextAttempts);
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    clearStoredAttempts(currentIdentifier);
    setFailedAttempts(0);
    window.location.href = '/dashboard';
  };

  const handleSendReset = async () => {
    setResetError(null);
    setResetSent(false);
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) {
      setResetError('아이디를 입력해주세요.');
      return;
    }
    setResetLoading(true);
    let targetEmail = rawIdentifier;

    if (!targetEmail.includes('@')) {
      const { data: userByUsername, error: userLookupError } = await supabase
        .from('users')
        .select('email')
        .eq('username', rawIdentifier)
        .maybeSingle();

      if (userLookupError) {
        const message = userLookupError.message || '';
        if (message.includes('email')) {
          setResetLoading(false);
          setResetError('프로필 이메일 컬럼이 아직 없습니다. 먼저 이메일 컬럼을 추가해주세요.');
          return;
        }
        setResetLoading(false);
        setResetError('프로필 이메일을 조회할 수 없습니다.');
        return;
      }

      if (userByUsername?.email) {
        targetEmail = userByUsername.email;
      } else {
        const { data: userByNickname } = await supabase
          .from('users')
          .select('email')
          .eq('nickname', rawIdentifier)
          .maybeSingle();
        if (userByNickname?.email) {
          targetEmail = userByNickname.email;
        }
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      setResetLoading(false);
      setResetError('등록된 이메일을 찾지 못했습니다. 이메일을 직접 입력해주세요.');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (resetError) {
      setResetError('비밀번호 재설정 메일 전송에 실패했습니다.');
      return;
    }
    setResetSent(true);
  };

  return (
    <section className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#1F2937' }}>
        로그인
      </h2>
      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            아이디
          </label>
          <input
            type="text"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            비밀번호
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        <button
          type="submit"
          className="btn-primary w-full py-2 rounded-md font-medium transition"
          disabled={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      {failedAttempts > 0 && failedAttempts < MAX_FAILED_ATTEMPTS && (
        <p className="mt-3 text-xs text-slate-500 text-center">
          로그인 실패 {failedAttempts}회 / {MAX_FAILED_ATTEMPTS}회
        </p>
      )}
      {isLocked && (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium">비밀번호를 3회 이상 틀려 재설정이 필요합니다.</p>
          <p className="mt-1 text-xs text-slate-500">재설정 후 새 비밀번호로 로그인하면 잠금이 해제됩니다.</p>
          {resetError && <p className="mt-2 text-xs text-red-600">{resetError}</p>}
          {resetSent && <p className="mt-2 text-xs text-emerald-600">재설정 메일을 보냈습니다.</p>}
          <button
            type="button"
            onClick={handleSendReset}
            className="mt-3 w-full rounded-md border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            disabled={resetLoading}
          >
            {resetLoading ? '전송 중...' : '비밀번호 재설정 메일 보내기'}
          </button>
        </div>
      )}
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        계정이 없으신가요? <a href="/register" className="text-blue-600 hover:underline">회원가입</a>
      </p>
    </section>
  );
}

export default LoginPage;








