import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BaseLayout from './components/BaseLayout';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SchedulePage from './pages/SchedulePage';
import FinancePage from './pages/FinancePage';
import FinanceMonthPage from './pages/FinanceMonthPage';
import ExercisePage from './pages/ExercisePage';
import ExerciseMonthPage from './pages/ExerciseMonthPage';
import BodyRecordsAllPage from './pages/BodyRecordsAllPage';
import JournalListPage from './pages/JournalListPage';
import JournalDetailPage from './pages/JournalDetailPage';
import JournalFormPage from './pages/JournalFormPage';
import FriendsPage from './pages/FriendsPage';
import TodosMonthPage from './pages/TodosMonthPage';
import AccountPage from './pages/AccountPage';
import { supabase } from './lib/supabaseClient';
import { navigate } from './lib/navigation';
import { canAccessFriendPage } from './lib/friendPermissions';

const IDLE_LIMIT_MS = 3 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = 'recorder:lastActiveAt';

const PAGE_COMPONENTS = {
  home: HomePage,
  landing: LandingPage,
  dashboard: DashboardPage,
  login: LoginPage,
  register: RegisterPage,
  resetPassword: ResetPasswordPage,
  schedule: SchedulePage,
  finance: FinancePage,
  financeMonth: FinanceMonthPage,
  exercise: ExercisePage,
  exerciseMonth: ExerciseMonthPage,
  bodyRecordsAll: BodyRecordsAllPage,
  journalList: JournalListPage,
  journalDetail: JournalDetailPage,
  journalForm: JournalFormPage,
  friends: FriendsPage,
  todosMonth: TodosMonthPage,
  account: AccountPage,
};

const resolveRoute = (pathname) => {
  if (pathname === '/') return { page: 'landing' };
  if (pathname === '/landing') return { page: 'landing' };
  if (pathname === '/dashboard') return { page: 'dashboard' };
  if (pathname === '/login') return { page: 'login' };
  if (pathname === '/register') return { page: 'register' };
  if (pathname === '/reset-password') return { page: 'resetPassword' };
  if (pathname === '/schedule') return { page: 'schedule' };
  if (pathname === '/finance') return { page: 'finance' };
  if (pathname.startsWith('/finance/month')) return { page: 'financeMonth' };
  if (pathname === '/exercise') return { page: 'exercise' };
  if (pathname.startsWith('/exercise/month')) return { page: 'exerciseMonth' };
  if (pathname === '/exercise/body/all') return { page: 'bodyRecordsAll' };
  if (pathname === '/journal') return { page: 'journalList' };
  if (pathname === '/journal/new') return { page: 'journalForm' };
  if (pathname.startsWith('/journal/')) {
    const id = pathname.split('/')[2];
    if (id) return { page: 'journalDetail', params: { journalId: id } };
  }
  if (pathname.startsWith('/friend/')) {
    const [, , friendId, type, detailId] = pathname.split('/');
    if (friendId && type) {
      if (!canAccessFriendPage(type)) return { page: 'friends' };
      if (type === 'exercise') return { page: 'exercise', params: { friendId, friendMode: true } };
      if (type === 'body') return { page: 'bodyRecordsAll', params: { friendId, friendMode: true } };
      if (type === 'journal' && detailId) {
        return { page: 'journalDetail', params: { journalId: detailId, friendId, friendMode: true } };
      }
      if (type === 'journal') return { page: 'journalList', params: { friendId, friendMode: true } };
    }
    return { page: 'friends' };
  }
  if (pathname === '/friends') return { page: 'friends' };
  if (pathname === '/todos/month') return { page: 'todosMonth' };
  if (pathname === '/account') return { page: 'account' };
  return { page: 'landing' };
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const lastSyncedProfile = useRef(null);
  const [location, setLocation] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  const route = useMemo(() => resolveRoute(location.pathname), [location.pathname]);
  const PageComponent = PAGE_COMPONENTS[route.page] || HomePage;

  const loadProfile = useCallback(async (user, mountedRef) => {
    if (!user) {
      if (mountedRef?.current) {
        setCurrentUser(null);
        setProfile(null);
      }
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, username, nickname, birth_date')
      .eq('id', user.id)
      .maybeSingle();
    if (mountedRef?.current) {
      setProfile(data || null);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    const mountedRef = { current: true };

    supabase.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user || null, mountedRef);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null, mountedRef);
    });

    const handleProfileUpdated = (event) => {
      const detail = event?.detail;
      if (detail && mountedRef.current) {
        setProfile((prev) => ({ ...(prev || {}), ...detail }));
      }
      supabase.auth.getSession().then(({ data }) => {
        loadProfile(data.session?.user || null, mountedRef);
      });
    };

    window.addEventListener('app:profile-updated', handleProfileUpdated);

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('app:profile-updated', handleProfileUpdated);
    };
  }, [loadProfile]);

  useEffect(() => {
    const handleNavigate = () => {
      setLocation({ pathname: window.location.pathname, search: window.location.search });
    };
    window.addEventListener('popstate', handleNavigate);
    window.addEventListener('app:navigate', handleNavigate);
    return () => {
      window.removeEventListener('popstate', handleNavigate);
      window.removeEventListener('app:navigate', handleNavigate);
    };
  }, []);

  const profileComplete = Boolean(profile?.username && profile?.birth_date);
  const appUser = currentUser
    ? {
        isAuthenticated: profileComplete,
        id: currentUser.id,
        email: currentUser.email,
        username: profile?.username || currentUser.user_metadata?.username || currentUser.email,
        nickname: profile?.nickname || currentUser.user_metadata?.nickname || null,
        birth_date: profile?.birth_date || currentUser.user_metadata?.birth_date || null,
        profileComplete,
      }
    : { isAuthenticated: false, profileComplete: false };

  useEffect(() => {
    if (!currentUser || profileComplete) return;
    if (location.pathname === '/' || location.pathname === '/register' || location.pathname === '/login' || location.pathname === '/landing' || location.pathname === '/reset-password') return;
    navigate('/register');
  }, [currentUser, profileComplete, location.pathname]);

  useEffect(() => {
    if (!currentUser || !profileComplete) return;
    if (location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [currentUser, profileComplete, location.pathname]);

  useEffect(() => {
    if (!currentUser || !profileComplete) return;
    if (location.pathname === '/login' || location.pathname === '/register') {
      navigate('/dashboard');
    }
  }, [currentUser, profileComplete, location.pathname]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const payload = {
      id: currentUser.id,
      email: currentUser.email || null,
    };

    const username = profile?.username || currentUser.user_metadata?.username;
    const nickname = profile?.nickname || currentUser.user_metadata?.nickname;
    const birthDate = profile?.birth_date || currentUser.user_metadata?.birth_date;

    if (username) payload.username = username;
    if (nickname) payload.nickname = nickname;
    if (birthDate) payload.birth_date = birthDate;

    const signature = JSON.stringify(payload);
    if (lastSyncedProfile.current === signature) return;
    lastSyncedProfile.current = signature;

    supabase.from('users').upsert([payload], { onConflict: 'id' }).then(({ error }) => {
      if (error) {
        lastSyncedProfile.current = null;
      }
    });
  }, [currentUser, profile]);

  useEffect(() => {
    if (!currentUser) return;

    const updateLastActive = () => {
      window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };

    updateLastActive();

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];
    events.forEach((eventName) => window.addEventListener(eventName, updateLastActive));

    const intervalId = window.setInterval(async () => {
      const stored = Number(window.localStorage.getItem(LAST_ACTIVE_KEY));
      const lastActiveAt = Number.isFinite(stored) ? stored : Date.now();
      if (Date.now() - lastActiveAt >= IDLE_LIMIT_MS) {
        await supabase.auth.signOut();
        navigate('/login');
      }
    }, 60 * 1000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, updateLastActive));
      window.clearInterval(intervalId);
    };
  }, [currentUser]);

  return (
    <BaseLayout
      currentUser={appUser}
      activePath={location.pathname}
      page={route.page}
    >
      <PageComponent currentUser={appUser} navigate={navigate} {...(route.params || {})} />
    </BaseLayout>
  );
}

export default App;

