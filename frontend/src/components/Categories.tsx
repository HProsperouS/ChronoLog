import { FolderTree, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { categoryRules, categoryColors } from '../data/mockData';
import { useState } from 'react';

export function Categories() {
  const [rules, setRules] = useState(categoryRules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const categories = ['Work', 'Study', 'Entertainment', 'Communication', 'Utilities', 'Uncategorized'];

  const handleDelete = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, category: newCategory as any } : rule
    ));
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Category Rules</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage application categorization
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Category Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {categories.slice(0, 6).map((category) => {
            const count = rules.filter(r => r.category === category).length;
            return (
              <div key={category} className="bg-[#13131a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: categoryColors[category] || '#9ca3af' }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{category}</p>
                      <p className="text-xs text-gray-500">{count} rules</p>
                    </div>
                  </div>
                  <FolderTree className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rules Table */}
        <div className="bg-[#13131a] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Application Rules</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Keywords
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isAdding && (
                  <tr className="bg-indigo-500/5">
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="Application name"
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder="keyword1, keyword2"
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400">
                        Manual
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSave}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {rules.map((rule) => {
                  const isEditing = editingId === rule.id;

                  return (
                    <tr key={rule.id} className={isEditing ? 'bg-indigo-500/5' : 'hover:bg-white/5'}>
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-white">{rule.appName}</span>
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select
                            value={rule.category}
                            onChange={(e) => handleCategoryChange(rule.id, e.target.value)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded"
                              style={{ backgroundColor: categoryColors[rule.category] }}
                            />
                            <span className="text-xs text-gray-400">{rule.category}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={rule.keywords?.join(', ') || ''}
                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">
                            {rule.keywords?.join(', ') || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            rule.isAutomatic
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}
                        >
                          {rule.isAutomatic ? 'Automatic' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSave}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(rule.id)}
                              className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-4 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-5">
          <div className="flex gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-lg">
              <FolderTree className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">How Category Rules Work</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                <strong className="text-white">Automatic rules</strong> are applied based on the application name alone.
                <strong className="text-white"> Manual rules</strong> use keywords to categorize based on window titles or URLs
                (useful for browsers). ChronoLog will automatically learn your preferences over time
                and suggest new rules based on your usage patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
