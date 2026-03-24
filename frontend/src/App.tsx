import { HashRouter, Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { Insights } from './components/Insights';
import { Categories } from './components/Categories';
import { Settings } from './components/Settings';
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  useNotifications(); // For Notificatiosn on web browser 

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activity" element={<ActivityTimeline />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
