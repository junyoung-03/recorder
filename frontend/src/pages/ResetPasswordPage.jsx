import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = {
    hasLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every((check) => check);
  const isPasswordMatch = password === passwordConfirm && passwordConfirm.length > 0;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!hasSession) {
      setError('재설정 링크로 접속해야 비밀번호를 변경할 수 있습니다.');
      return;
    }

    if (!isPasswordValid) {
      setError('비밀번호 요구사항을 모두 만족해야 합니다.');
      return;
    }

    if (!isPasswordMatch) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError('비밀번호 변경에 실패했습니다.');
      return;
    }

    setSuccess(true);
  };

  if (checking) {
    return (
      <section className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <p className="text-sm text-slate-500">세션 확인 중...</p>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#1F2937' }}>
        비밀번호 재설정
      </h2>
      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>
          비밀번호가 변경되었습니다. 로그인 화면으로 이동하세요.
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            새 비밀번호
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: password && !isPasswordValid ? '#EF4444' : '#E5E7EB' }}
          />
          {password && (
            <div className="mt-2 space-y-1">
              <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasLength ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{passwordChecks.hasLength ? '✓' : '○'}</span>
                <span>8자 이상</span>
              </div>
              <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasLetter ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{passwordChecks.hasLetter ? '✓' : '○'}</span>
                <span>영문 포함</span>
              </div>
              <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{passwordChecks.hasNumber ? '✓' : '○'}</span>
                <span>숫자 포함</span>
              </div>
              <div className={`text-xs flex items-center gap-2 ${passwordChecks.hasSpecial ? 'text-green-600' : 'text-gray-400'}`}>
                <span>{passwordChecks.hasSpecial ? '✓' : '○'}</span>
                <span>특수문자 포함</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            새 비밀번호 확인
          </label>
          <input
            type="password"
            required
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: passwordConfirm && !isPasswordMatch ? '#EF4444' : '#E5E7EB' }}
          />
          {passwordConfirm && (
            <div className="mt-2">
              {isPasswordMatch ? (
                <div className="text-xs text-green-600 flex items-center gap-2">
                  <span>✓</span>
                  <span>비밀번호가 일치합니다</span>
                </div>
              ) : (
                <div className="text-xs text-red-500 flex items-center gap-2">
                  <span>○</span>
                  <span>비밀번호가 일치하지 않습니다</span>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn-primary w-full py-2 rounded-md font-medium transition"
          disabled={loading || success || !isPasswordValid || !isPasswordMatch}
        >
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        <a href="/login" className="text-blue-600 hover:underline">로그인으로 돌아가기</a>
      </p>
    </section>
  );
}

export default ResetPasswordPage;
