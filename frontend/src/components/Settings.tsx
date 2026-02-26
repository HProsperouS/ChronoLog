import { Shield, Eye, EyeOff, Clock, Bell, Database, Lock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [screenshotEnabled, setScreenshotEnabled] = useState(false);
  const [idleDetection, setIdleDetection] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const [excludedApps, setExcludedApps] = useState(['1Password', 'Bitwarden', 'KeePass']);

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Settings & Privacy</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Control your tracking preferences
            </p>
          </div>
          <button className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all">
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-4xl">
        {/* Privacy Alert */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-xl p-5 mb-6">
          <div className="flex gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">Your Privacy Matters</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                All tracking data is stored locally on your computer. ChronoLog does not send any data
                to external servers. You have full control over what is tracked and can delete your
                data at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Settings */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Tracking Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Enable Time Tracking</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically track application usage in the background
                </p>
              </div>
              <button
                onClick={() => setTrackingEnabled(!trackingEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  trackingEnabled ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    trackingEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Idle Time Detection</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pause tracking after 5 minutes of inactivity
                </p>
              </div>
              <button
                onClick={() => setIdleDetection(!idleDetection)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  idleDetection ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    idleDetection ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Screenshot Capture</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Take periodic screenshots for visual timeline (stored locally)
                </p>
              </div>
              <button
                onClick={() => setScreenshotEnabled(!screenshotEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  screenshotEnabled ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    screenshotEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Productivity Notifications</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Get gentle reminders about focus time and breaks
                </p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  notifications ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Exclusions */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Privacy & Exclusions</h2>
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-medium text-white mb-2">Excluded Applications</h3>
            <p className="text-xs text-gray-500 mb-3">
              These applications will never be tracked (recommended for password managers)
            </p>
            <div className="space-y-2">
              {excludedApps.map((app, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/[0.07] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-white">{app}</span>
                  </div>
                  <button
                    onClick={() => setExcludedApps(excludedApps.filter((_, i) => i !== index))}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full px-4 py-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
              + Add Application
            </button>
          </div>

          <div className="pt-5 border-t border-white/5">
            <h3 className="text-sm font-medium text-white mb-2">Private Browsing Detection</h3>
            <p className="text-xs text-gray-500 mb-3">
              Automatically exclude tracking when browsers are in incognito/private mode
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                className="w-3.5 h-3.5 text-indigo-600 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
              />
              <label className="text-xs text-gray-400">
                Respect private browsing mode
              </label>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <Database className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Data Management</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-white">Database Size</h3>
                <p className="text-xs text-gray-500 mt-0.5">Total storage used by ChronoLog</p>
              </div>
              <span className="text-base font-semibold text-white">24.3 MB</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-white">Data Retention</h3>
                <p className="text-xs text-gray-500 mt-0.5">Automatically delete data older than</p>
              </div>
              <select className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
                <option>3 months</option>
                <option>6 months</option>
                <option>1 year</option>
                <option>Never</option>
              </select>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-2">
              <button className="w-full px-4 py-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
                Export All Data (JSON)
              </button>
              <button className="w-full px-4 py-2 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-all">
                Clear Data Older Than 30 Days
              </button>
              <button className="w-full px-4 py-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Delete All Tracking Data
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Advanced</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Launch at System Startup</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically start ChronoLog when your computer boots
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-3.5 h-3.5 text-indigo-600 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">Run in Background</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Keep tracking even when the window is closed
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-3.5 h-3.5 text-indigo-600 bg-white/5 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0"
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <h3 className="text-sm font-medium text-white mb-2">Tracking Interval</h3>
              <p className="text-xs text-gray-500 mb-3">
                How often to check active window (lower = more accurate, higher CPU usage)
              </p>
              <select className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500" defaultValue="5 seconds (Recommended)">
                <option>1 second (Highest accuracy)</option>
                <option>5 seconds (Recommended)</option>
                <option>10 seconds (Battery saver)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
