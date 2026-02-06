import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const toAuthEmail = (value) => {
  if (!value) return '';
  return value.includes('@') ? value : `${value}@recorder.local`;
};

function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const email = toAuthEmail(identifier.trim());
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    window.location.href = '/dashboard';
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
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        계정이 없으신가요? <a href="/register" className="text-blue-600 hover:underline">회원가입</a>
      </p>
    </section>
  );
}

export default LoginPage;








