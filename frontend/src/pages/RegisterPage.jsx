import React, { useState } from 'react';

function RegisterPage({ error }) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // 비밀번호 유효성 검사
  const passwordChecks = {
    hasLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(check => check);
  const isPasswordMatch = password === passwordConfirm && passwordConfirm.length > 0;

  const handleSubmit = (e) => {
    if (!isPasswordValid) {
      e.preventDefault();
      alert('비밀번호 요구사항을 모두 만족해야 합니다.');
      return;
    }
    if (!isPasswordMatch) {
      e.preventDefault();
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
  };

  return (
    <section className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#1F2937' }}>
        회원가입
      </h2>
      {error && (
        <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}
      <form method="post" className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            아이디
          </label>
          <input type="text" name="username" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            닉네임 (선택)
          </label>
          <input type="text" name="nickname" className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            비밀번호
          </label>
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            비밀번호 확인
          </label>
          <input
            type="password"
            name="password_confirm"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          disabled={!isPasswordValid || !isPasswordMatch}
          className={`w-full py-2 rounded-md font-medium transition ${
            isPasswordValid && isPasswordMatch
              ? 'btn-primary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          회원가입
        </button>
      </form>
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        이미 계정이 있으신가요? <a href="/login" className="text-blue-600 hover:underline">로그인</a>
      </p>
    </section>
  );
}

export default RegisterPage;





