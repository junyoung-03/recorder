import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import defaultAvatar from '../assets/default-avatar.svg';

const MENU_ITEMS = [
  { key: 'profile', label: '프로필' },
  { key: 'security', label: '계정·보안' },
  { key: 'preferences', label: '환경 설정' },
  { key: 'notifications', label: '알림' },
  { key: 'data', label: '데이터 관리' },
];

const FieldBox = ({ label, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-1">{children}</div>
  </div>
);

const SectionCard = ({ title, description, children, note }) => (
  <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {description ? <p className="text-xs text-slate-500 mt-1">{description}</p> : null}
    </div>
    <div className="text-sm text-slate-700">{children}</div>
    {note ? <p className="text-xs text-slate-400">{note}</p> : null}
  </section>
);

function AccountPage({ currentUser }) {
  const [activeKey, setActiveKey] = useState('profile');
  const [nickname, setNickname] = useState(currentUser?.nickname || '');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || defaultAvatar);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [savingNickname, setSavingNickname] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const nicknameInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [recordStats, setRecordStats] = useState(null);
  const [recordStatsError, setRecordStatsError] = useState(null);
  const displayName = nickname.trim() || currentUser?.nickname || currentUser?.username || '사용자';
  const username = currentUser?.username || 'an519221';
  const email = currentUser?.email || '';
  const nicknameSaveTimer = useRef(null);
  const lastSavedBirthDate = useRef(null);
  const birthSaveTimer = useRef(null);
  const [language, setLanguage] = useState('ko');
  const [dateFormat, setDateFormat] = useState('yyyy-mm-dd');
  const [weekStart, setWeekStart] = useState('monday');
  const [theme, setTheme] = useState('warm');
  const [widgets, setWidgets] = useState({
    fortune: true,
    finance: true,
    schedule: true,
    exercise: true,
    journal: true,
  });
  const [notificationEmailTodo, setNotificationEmailTodo] = useState(false);
  const [notificationEmailSchedule, setNotificationEmailSchedule] = useState(false);
  const [summaryTime, setSummaryTime] = useState('21:00');
  const PROFILE_BUCKET = 'photos';
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

  const activeLabel = useMemo(
    () => MENU_ITEMS.find((item) => item.key === activeKey)?.label,
    [activeKey],
  );

  useEffect(() => {
    if (currentUser?.birth_date) {
      setBirthDate(currentUser.birth_date);
    }
  }, [currentUser?.birth_date]);

  useEffect(() => {
    setAvatarUrl(currentUser?.avatarUrl || defaultAvatar);
  }, [currentUser?.avatarUrl]);

  useEffect(() => {
    if (isEditingNickname) return;
    setNickname(currentUser?.nickname || '');
  }, [currentUser?.nickname, isEditingNickname]);

  useEffect(() => {
    if (!currentUser?.id) return;
    let isActive = true;

    const loadRecordStats = async () => {
      setRecordStatsError(null);
      const tables = [
        { key: 'journals', label: '일기', table: 'journals' },
        { key: 'exercise', label: '운동', table: 'exercise_records' },
        { key: 'todos', label: '할 일', table: 'todos' },
        { key: 'schedules', label: '일정', table: 'schedules' },
        { key: 'finance', label: '가계부', table: 'finance_records' },
        { key: 'body', label: '몸 기록', table: 'body_records' },
      ];

      const results = await Promise.all(
        tables.map(async (item) => {
          const { count, error } = await supabase
            .from(item.table)
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id);
          return { ...item, count: error ? null : count || 0, error };
        }),
      );

      if (!isActive) return;
      if (results.every((item) => item.error)) {
        setRecordStatsError('기록 통계를 불러오지 못했습니다.');
        return;
      }

      const validResults = results.filter((item) => item.count !== null);
      const total = validResults.reduce((sum, item) => sum + (item.count || 0), 0);
      setRecordStats({ total, items: validResults });
    };

    loadRecordStats();

    return () => {
      isActive = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (isEditingNickname) {
      nicknameInputRef.current?.focus();
    }
  }, [isEditingNickname]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (!birthDate) return;
    if (lastSavedBirthDate.current === birthDate) return;

    if (birthSaveTimer.current) {
      window.clearTimeout(birthSaveTimer.current);
    }

    birthSaveTimer.current = window.setTimeout(async () => {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { birth_date: birthDate },
      });
      if (updateError) return;

      const payload = {
        id: currentUser.id,
        username: currentUser.username,
        nickname: currentUser.nickname,
        email: currentUser.email || null,
        birth_date: birthDate,
      };
      const { error: profileError } = await supabase.from('users').upsert([payload], { onConflict: 'id' });
      if (!profileError) {
        lastSavedBirthDate.current = birthDate;
        window.dispatchEvent(new CustomEvent('app:profile-updated', { detail: { birth_date: birthDate } }));
      }
    }, 300);

    return () => {
      if (birthSaveTimer.current) {
        window.clearTimeout(birthSaveTimer.current);
      }
    };
  }, [birthDate, currentUser]);

  const handleNotReady = (message = '해당 기능은 준비 중입니다.') => {
    alert(message);
  };

  const handleSaveNickname = async () => {
    if (!currentUser?.id) return;
    const trimmedNickname = nickname.trim();
    setSavingNickname(true);
    if (nicknameSaveTimer.current) {
      window.clearTimeout(nicknameSaveTimer.current);
    }
    nicknameSaveTimer.current = window.setTimeout(() => {
      setSavingNickname(false);
      nicknameSaveTimer.current = null;
    }, 8000);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { nickname: trimmedNickname || null },
      });
      if (updateError) {
        alert('닉네임 저장에 실패했습니다.');
        return;
      }

      const payload = {
        id: currentUser.id,
        username: currentUser.username,
        nickname: trimmedNickname || null,
        email: currentUser.email || null,
        birth_date: birthDate || null,
      };
      const { error: profileError } = await supabase.from('users').upsert([payload], { onConflict: 'id' });
      if (profileError) {
        alert('닉네임 저장에 실패했습니다.');
        return;
      }
      window.dispatchEvent(new CustomEvent('app:profile-updated', { detail: { nickname: trimmedNickname } }));
      setIsEditingNickname(false);
      alert('닉네임이 저장되었습니다.');
    } finally {
      setSavingNickname(false);
      if (nicknameSaveTimer.current) {
        window.clearTimeout(nicknameSaveTimer.current);
        nicknameSaveTimer.current = null;
      }
    }
  };

  const handleDeleteAccount = () => {
    const input = prompt(`정말 삭제하시겠습니까? ${username}를 입력하세요.`);
    if (input === username) {
      alert('계정 삭제 요청이 접수되었습니다. (준비 중)');
    } else if (input !== null) {
      alert('입력한 아이디가 일치하지 않습니다.');
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!currentUser?.id) {
      setAvatarError('로그인 후 사용할 수 있습니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('파일 용량은 5MB 이하만 가능합니다.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
      const filePath = `avatars/${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExtension}`;
      const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (uploadError) {
        setAvatarError('프로필 사진 업로드에 실패했습니다.');
        return;
      }

      const { data: publicData } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        setAvatarError('프로필 사진 URL을 만들지 못했습니다.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) {
        setAvatarError('프로필 사진 저장에 실패했습니다.');
        return;
      }

      const profilePayload = {
        id: currentUser.id,
        username: currentUser.username,
        nickname: currentUser.nickname || null,
        email: currentUser.email || null,
        birth_date: birthDate || null,
        avatar_url: publicUrl,
      };
      const { error: profileError } = await supabase.from('users').upsert([profilePayload], { onConflict: 'id' });
      if (profileError) {
        const message = profileError.message || '';
        if (message.includes('avatar_url') || message.includes('schema cache')) {
          await supabase.from('users').upsert(
            [
              {
                id: currentUser.id,
                username: currentUser.username,
                nickname: currentUser.nickname || null,
                email: currentUser.email || null,
                birth_date: birthDate || null,
              },
            ],
            { onConflict: 'id' },
          );
        }
      }

      setAvatarUrl(publicUrl);
      window.dispatchEvent(new CustomEvent('app:profile-updated', { detail: { avatar_url: publicUrl } }));
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  };

  const handleResetAvatar = async () => {
    if (!currentUser?.id) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: defaultAvatar },
      });
      if (updateError) {
        setAvatarError('기본 이미지로 변경에 실패했습니다.');
        return;
      }

      const profilePayload = {
        id: currentUser.id,
        username: currentUser.username,
        nickname: currentUser.nickname || null,
        email: currentUser.email || null,
        birth_date: birthDate || null,
        avatar_url: defaultAvatar,
      };
      await supabase.from('users').upsert([profilePayload], { onConflict: 'id' });

      setAvatarUrl(defaultAvatar);
      window.dispatchEvent(new CustomEvent('app:profile-updated', { detail: { avatar_url: defaultAvatar } }));
    } finally {
      setAvatarUploading(false);
    }
  };

  

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-card-title mb-4">내 계정</h2>
          <div className="space-y-2">
            {MENU_ITEMS.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveKey(item.key)}
                  className={`w-full px-4 py-2.5 rounded-full text-sm font-semibold text-left transition border ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-3xl bg-white shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <header className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{activeLabel}</h3>
            {activeKey === 'profile' && <p className="text-sm text-slate-500">Recorder 프로필 정보를 관리하세요.</p>}
            {activeKey === 'security' && <p className="text-sm text-slate-500">로그인 정보와 보안 설정을 관리하세요.</p>}
            {activeKey === 'preferences' && <p className="text-sm text-slate-500">Recorder의 테마와 표시 방식을 설정하세요.</p>}
            {activeKey === 'notifications' && <p className="text-sm text-slate-500">하루 요약과 일정 알림을 설정하세요.</p>}
            {activeKey === 'data' && <p className="text-sm text-slate-500">Recorder에 저장된 데이터를 내보내거나 계정을 삭제할 수 있습니다.</p>}
          </header>

          {activeKey === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative w-24 h-24 rounded-full border border-slate-200 bg-slate-100 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="프로필 사진" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-100" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-base font-semibold text-slate-900">{displayName}</h4>
                  <p className="text-sm text-slate-500">아이디 {username} · Recorder 기본 프로필</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => handleNotReady()}>
                      프로필 편집
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 text-sm font-semibold"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? '업로드 중...' : '사진 변경'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 text-sm font-semibold"
                      onClick={handleResetAvatar}
                      disabled={avatarUploading}
                    >
                      기본 이미지로 변경
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <FieldBox label="아이디">
                      <span>{username}</span>
                    </FieldBox>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <label className="text-xs text-gray-500">닉네임</label>
                      <div className="mt-1 flex flex-wrap gap-2 items-center">
                        <input
                          type="text"
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                          ref={nicknameInputRef}
                          disabled={!isEditingNickname}
                          className={`flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none ${!isEditingNickname ? 'cursor-not-allowed text-slate-400' : ''}`}
                          placeholder="닉네임 입력"
                        />
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1.5 text-xs font-semibold"
                          onClick={() => {
                            if (!isEditingNickname) {
                              setIsEditingNickname(true);
                              return;
                            }
                            handleSaveNickname();
                          }}
                          disabled={savingNickname}
                        >
                          {savingNickname ? '수정 중...' : (isEditingNickname ? '완료' : '수정')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <label className="text-xs text-gray-500">생년월일</label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(event) => setBirthDate(event.target.value)}
                        className="mt-1 w-full text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <SectionCard
                title="내 기록 통계"
                description="Recorder에 저장된 기록 현황을 요약합니다."
              >
                {recordStatsError ? (
                  <div className="text-sm text-slate-500">{recordStatsError}</div>
                ) : recordStats && recordStats.total === 0 ? (
                  <div className="text-sm text-slate-600">
                    아직 기록이 없어요. 오늘의 일정, 할 일, 지출, 운동 중 하나만 간단히 기록해보세요.
                  </div>
                ) : recordStats ? (
                  <div className="space-y-1 text-sm text-slate-700">
                    <div>총 기록 수: {recordStats.total}개</div>
                    <div>
                      {recordStats.items
                        .filter((item) => item.count && item.count > 0)
                        .map((item) => `${item.label}: ${item.count}개`)
                        .join(' · ')}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">기록 통계를 불러오는 중입니다...</div>
                )}
              </SectionCard>

            </div>
          )}

          {activeKey === 'security' && (
            <div className="space-y-4">
              <SectionCard title="계정 정보" description="이메일, 로그인 방식 등을 관리합니다.">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">이메일</div>
                      <div className="text-sm font-semibold text-slate-800">{email || '이메일 없음'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">로그인 ID</div>
                    <div className="text-sm font-semibold text-slate-800">{username}</div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="비밀번호" description="안전한 비밀번호를 사용하고 정기적으로 변경해 주세요.">
                <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => handleNotReady('비밀번호 변경은 준비 중입니다.')}>
                  비밀번호 변경
                </button>
              </SectionCard>

              <SectionCard title="최근 로그인" description="로그인 기록은 추후 확장될 예정입니다.">
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>오늘 10:23 · Chrome · Windows</li>
                  <li>어제 21:12 · Mobile</li>
                </ul>
              </SectionCard>
            </div>
          )}

          {activeKey === 'preferences' && (
            <div className="space-y-4">
              <SectionCard title="일반" description="언어, 날짜 형식, 주 시작 요일을 설정합니다.">
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-600">언어</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="ko">한국어</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-slate-600">날짜 형식</span>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { value: 'yyyy-mm-dd', label: '2026-02-05' },
                        { value: 'yyyy.mm.dd', label: '2026.02.05' },
                        { value: 'mm/dd/yyyy', label: '02/05/2026' },
                      ].map((item) => (
                        <label key={item.value} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name="date-format"
                            value={item.value}
                            checked={dateFormat === item.value}
                            onChange={(event) => setDateFormat(event.target.value)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-slate-600">주 시작 요일</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="week-start"
                          value="monday"
                          checked={weekStart === 'monday'}
                          onChange={(event) => setWeekStart(event.target.value)}
                        />
                        월요일
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="week-start"
                          value="sunday"
                          checked={weekStart === 'sunday'}
                          onChange={(event) => setWeekStart(event.target.value)}
                        />
                        일요일
                      </label>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="테마" description="Recorder를 기본 테마 또는 Warm Planner 테마 중에서 선택할 수 있습니다.">
                <div className="space-y-3">
                  {[
                    { value: 'default', label: 'Default' },
                    { value: 'warm', label: 'Warm Planner (현재)' },
                  ].map((item) => (
                    <label key={item.value} className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="theme"
                        value={item.value}
                        checked={theme === item.value}
                        onChange={(event) => setTheme(event.target.value)}
                      />
                      <span>{item.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="w-8 h-5 rounded border border-slate-200 bg-slate-50" />
                        <span className="w-8 h-5 rounded border border-slate-200 bg-white" />
                      </span>
                    </label>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="대시보드 위젯" description="홈 화면에 표시할 위젯을 선택하세요. 선택을 변경해도 데이터는 삭제되지 않습니다.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widgets.fortune}
                      onChange={(event) => setWidgets((prev) => ({ ...prev, fortune: event.target.checked }))}
                    />
                    오늘의 운세
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widgets.finance}
                      onChange={(event) => setWidgets((prev) => ({ ...prev, finance: event.target.checked }))}
                    />
                    지출 요약
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widgets.schedule}
                      onChange={(event) => setWidgets((prev) => ({ ...prev, schedule: event.target.checked }))}
                    />
                    오늘 일정
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widgets.exercise}
                      onChange={(event) => setWidgets((prev) => ({ ...prev, exercise: event.target.checked }))}
                    />
                    운동/몸 상태 카드
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={widgets.journal}
                      onChange={(event) => setWidgets((prev) => ({ ...prev, journal: event.target.checked }))}
                    />
                    최근 일기
                  </label>
                </div>
              </SectionCard>
            </div>
          )}

          {activeKey === 'notifications' && (
            <div className="space-y-4">
              <SectionCard title="알림 채널" description="이메일 알림은 추후 업데이트될 예정입니다.">
                <div className="space-y-2 text-sm text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationEmailTodo}
                      onChange={(event) => setNotificationEmailTodo(event.target.checked)}
                    />
                    이메일로 오늘 할 일 요약 받기
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationEmailSchedule}
                      onChange={(event) => setNotificationEmailSchedule(event.target.checked)}
                    />
                    이메일로 일정 시작 30분 전 알림 받기
                  </label>
                </div>
                <p className="text-xs text-slate-400">알림 기능은 추후 업데이트될 예정입니다.</p>
              </SectionCard>

              <SectionCard title="요약 알림 시간" description="이 시간에 오늘의 할 일/지출/운동 요약을 보내드립니다. (추후 이메일로 제공 예정)">
                <input
                  type="time"
                  value={summaryTime}
                  onChange={(event) => setSummaryTime(event.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </SectionCard>
            </div>
          )}

          {activeKey === 'data' && (
            <div className="space-y-4">
              <SectionCard title="데이터 내보내기" description="Recorder에 기록한 일정, 할 일, 지출, 운동, 몸 기록 등을 파일로 내려받습니다.">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => handleNotReady('CSV 내보내기는 준비 중입니다.')}>
                    CSV로 내보내기
                  </button>
                  <button type="button" className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => handleNotReady('JSON 내보내기는 준비 중입니다.')}>
                    JSON으로 내보내기
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="백업/복원" description="데이터 백업 및 복원 기능은 추후 제공될 예정입니다.">
                <p className="text-sm text-slate-600">지금은 데이터 내보내기 기능을 사용해 주세요.</p>
              </SectionCard>

              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-2">
                <h4 className="text-sm font-semibold text-red-700">계정 삭제</h4>
                <p className="text-sm text-red-700">
                  Recorder 계정과 모든 기록을 완전히 삭제합니다. 삭제된 데이터는 복구할 수 없습니다.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-full bg-red-600 text-white text-sm font-semibold px-4 py-2"
                  onClick={handleDeleteAccount}
                >
                  계정 삭제
                </button>
              </section>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export default AccountPage;
