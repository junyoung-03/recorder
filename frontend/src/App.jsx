import React, { useEffect, useMemo, useState } from 'react';
import BaseLayout from './components/BaseLayout';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SchedulePage from './pages/SchedulePage';
import FinancePage from './pages/FinancePage';
import FinanceMonthPage from './pages/FinanceMonthPage';
import ExercisePage from './pages/ExercisePage';
import ExerciseMonthPage from './pages/ExerciseMonthPage';
import BodyRecordsAllPage from './pages/BodyRecordsAllPage';
import MealsPage from './pages/MealsPage';
import FriendMealsPage from './pages/FriendMealsPage';
import JournalListPage from './pages/JournalListPage';
import JournalDetailPage from './pages/JournalDetailPage';
import JournalFormPage from './pages/JournalFormPage';
import FriendJournalPage from './pages/FriendJournalPage';
import FriendsPage from './pages/FriendsPage';
import TodosMonthPage from './pages/TodosMonthPage';
import AccountPage from './pages/AccountPage';
import { supabase } from './lib/supabaseClient';
import { navigate } from './lib/navigation';

const PAGE_COMPONENTS = {
  home: HomePage,
  landing: LandingPage,
  dashboard: DashboardPage,
  login: LoginPage,
  register: RegisterPage,
  schedule: SchedulePage,
  finance: FinancePage,
  financeMonth: FinanceMonthPage,
  exercise: ExercisePage,
  exerciseMonth: ExerciseMonthPage,
  bodyRecordsAll: BodyRecordsAllPage,
  meals: MealsPage,
  friendMeals: FriendMealsPage,
  journalList: JournalListPage,
  journalDetail: JournalDetailPage,
  journalForm: JournalFormPage,
  friendJournal: FriendJournalPage,
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
  if (pathname === '/schedule') return { page: 'schedule' };
  if (pathname === '/finance') return { page: 'finance' };
  if (pathname.startsWith('/finance/month')) return { page: 'financeMonth' };
  if (pathname === '/exercise') return { page: 'exercise' };
  if (pathname.startsWith('/exercise/month')) return { page: 'exerciseMonth' };
  if (pathname === '/exercise/body/all') return { page: 'bodyRecordsAll' };
  if (pathname === '/meals') return { page: 'meals' };
  if (pathname === '/journal') return { page: 'journalList' };
  if (pathname === '/journal/new') return { page: 'journalForm' };
  if (pathname.startsWith('/journal/')) {
    const id = pathname.split('/')[2];
    if (id) return { page: 'journalDetail', params: { journalId: id } };
  }
  if (pathname.startsWith('/friend/')) {
    const [, , friendId, type] = pathname.split('/');
    if (friendId && type === 'meals') return { page: 'friendMeals', params: { friendId } };
    if (friendId && type === 'journal') return { page: 'friendJournal', params: { friendId } };
  }
  if (pathname === '/friends') return { page: 'friends' };
  if (pathname === '/todos/month') return { page: 'todosMonth' };
  if (pathname === '/account') return { page: 'account' };
  return { page: 'landing' };
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  const route = useMemo(() => resolveRoute(location.pathname), [location.pathname]);
  const PageComponent = PAGE_COMPONENTS[route.page] || HomePage;

  useEffect(() => {
    let mounted = true;
    const loadProfile = async (user) => {
      if (!user) {
        if (mounted) {
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
      if (mounted) {
        setProfile(data || null);
        setCurrentUser(user);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user || null);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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
    if (location.pathname === '/' || location.pathname === '/register' || location.pathname === '/login' || location.pathname === '/landing') return;
    navigate('/register');
  }, [currentUser, profileComplete, location.pathname]);

  useEffect(() => {
    if (!currentUser || !profileComplete) return;
    if (location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [currentUser, profileComplete, location.pathname]);

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

