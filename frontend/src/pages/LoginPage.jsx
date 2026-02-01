import React from 'react';

function LoginPage({ error }) {
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
      <form method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            아이디
          </label>
          <input type="text" name="username" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1F2937' }}>
            비밀번호
          </label>
          <input type="password" name="password" required className="w-full p-2 border rounded-md" style={{ borderColor: '#E5E7EB' }} />
        </div>
        <button type="submit" className="btn-primary w-full py-2 rounded-md font-medium transition">
          로그인
        </button>
      </form>
      <p className="text-sm text-center mt-4" style={{ color: '#6B7280' }}>
        계정이 없으신가요? <a href="/register" className="text-blue-600 hover:underline">회원가입</a>
      </p>
    </section>
  );
}

export default LoginPage;





