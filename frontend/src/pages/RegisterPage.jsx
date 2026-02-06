import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function RegisterPage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 비밀번호 유효성 검사
  const passwordChecks = {
    hasLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(check => check);
  const isPasswordMatch = password === passwordConfirm && passwordConfirm.length > 0;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (!trimmedEmail.endsWith('@gmail.com')) {
      setError('구글 이메일(@gmail.com)만 입력 가능합니다.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      // NOTE: emailRedirectTo가 없으면 OTP 코드 방식으로 발송됨
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError('인증코드 전송에 실패했습니다.');
      return;
    }
    setOtpSent(true);
    setOtpVerified(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpSent) return;
    if (!otpCode.trim()) {
      setError('인증코드를 입력해주세요.');
      return;
    }
    setError(null);
    setVerifying(true);
    const trimmedEmail = email.trim();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: otpCode.trim(),
      type: 'email',
    });
    setVerifying(false);
    if (verifyError || !data?.session) {
      setOtpVerified(false);
      setError('인증코드가 올바르지 않습니다.');
      return;
    }
    setOtpVerified(true);
  };

  const handleSubmit = async (e) => {
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
    e.preventDefault();
    if (!otpSent) {
      setError('먼저 인증코드를 전송해주세요.');
      return;
    }
    if (!otpVerified) {
      setError('인증코드 확인이 필요합니다.');
      return;
    }
    setError(null);
    setLoading(true);
    const trimmedEmail = email.trim();
    const { data: sessionInfo } = await supabase.auth.getSession();
    if (!sessionInfo?.session) {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: otpCode.trim(),
        type: 'email',
      });
      if (verifyError || !verifyData?.session) {
        setLoading(false);
        setError('인증 세션이 만료되었습니다. 인증코드를 다시 확인해주세요.');
        return;
      }
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        username: username.trim(),
        nickname: nickname.trim() || null,
        birth_date: birthDate || null,
      },
    });
    if (updateError) {
      const message = updateError.message || '';
      if (!message.includes('New password should be different from the old password')) {
        setLoading(false);
        setError(`회원 정보 저장에 실패했습니다. ${message}`.trim());
        return;
      }
    }
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user?.id) {
      const baseProfile = {
        id: sessionData.user.id,
        username: username.trim(),
        nickname: nickname.trim() || null,
      };
      const { error: profileError } = await supabase.from('users').upsert(
        [
          {
            ...baseProfile,
            birth_date: birthDate || null,
          },
        ],
        { onConflict: 'id' },
      );
      if (profileError) {
        const message = profileError.message || '';
        if (message.includes('birth_date') && message.includes('schema cache')) {
          const { error: retryError } = await supabase.from('users').upsert(
            [baseProfile],
            { onConflict: 'id' },
          );
          if (retryError) {
            setLoading(false);
            setError('프로필 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
            return;
          }
        } else {
          setLoading(false);
          setError('프로필 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }
      }
    }
    setLoading(false);
    window.location.href = '/dashboard';
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
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            구글 이메일
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              style={{ borderColor: '#E5E7EB' }}
              placeholder="example@gmail.com"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              className={`px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-full border transition ${
                otpSent ? 'bg-blue-50 border-blue-200 text-blue-600' : 'btn-secondary'
              }`}
              disabled={loading}
            >
              {loading ? '전송 중...' : (otpSent ? '재전송' : '전송')}
            </button>
          </div>
        </div>
        {otpSent && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
              인증코드
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value);
                  setOtpVerified(false);
                }}
                className="w-full p-2 border rounded-md"
                style={{ borderColor: '#E5E7EB' }}
                placeholder="이메일로 받은 코드 입력"
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                className={`px-3 py-2 text-sm font-semibold whitespace-nowrap rounded-full border transition ${
                  otpVerified ? 'bg-green-50 border-green-200 text-green-600' : 'btn-secondary'
                }`}
                disabled={verifying}
              >
                {verifying ? '확인 중...' : (otpVerified ? '확인됨' : '확인')}
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            아이디
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            닉네임 (선택)
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-2 border rounded-md"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            생년월일
          </label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
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
          disabled={!isPasswordValid || !isPasswordMatch || loading}
          className={`w-full py-2 rounded-md font-medium transition ${
            isPasswordValid && isPasswordMatch && !loading
              ? 'btn-primary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        이미 계정이 있으신가요? <a href="/login" className="text-blue-600 hover:underline">로그인</a>
      </p>
    </section>
  );
}

export default RegisterPage;








