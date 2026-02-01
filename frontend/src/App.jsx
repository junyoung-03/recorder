import React from 'react';
import BaseLayout from './components/BaseLayout';
import HomePage from './pages/HomePage';
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

const PAGE_COMPONENTS = {
  home: HomePage,
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
};

function App() {
  const bootstrap = window.__BOOTSTRAP__ || {};
  const { page, props, currentUser, activePath } = bootstrap;
  const PageComponent = PAGE_COMPONENTS[page] || HomePage;

  return (
    <BaseLayout currentUser={currentUser} activePath={activePath || '/'}>
      <PageComponent {...(props || {})} />
    </BaseLayout>
  );
}

export default App;

