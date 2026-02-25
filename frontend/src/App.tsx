import { BrowserRouter, Routes, Route } from 'react-router';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { Insights } from './components/Insights';
import { Categories } from './components/Categories';
import { Settings } from './components/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main App with Sidebar */}
        <Route path="/*" element={
          <div className="flex h-screen bg-[#0a0a0f]">
            <Sidebar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/activity" element={<ActivityTimeline />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}