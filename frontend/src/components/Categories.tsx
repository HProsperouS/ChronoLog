import { useEffect, useState } from 'react';
import { FolderTree, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlashContainer, useFlash } from '@/components/ui/alert';
import * as api from '../api';
import { categoryColors } from '../constants';
import type { CategoryRule } from '../types';

const EMPTY_DRAFT = { appName: '', category: 'Work' as CategoryRule['category'], keywords: '', isAutomatic: false };

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export function Categories() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { messages, flash, dismiss } = useFlash();

const categories = [
  'Work',
  'Study',
  'Entertainment',
  'Communication',
  'Utilities',
  'Uncategorized',
  'ChronoLog',
];

  useEffect(() => {
    api.getCategoryRules().then(setRules).catch(() => flash('error', 'Failed to load category rules'));
  }, []);

 

  async function confirmDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.deleteCategoryRule(deletingId);
      setRules((prev) => prev.filter((r) => r.id !== deletingId));
      flash('success', 'Rule deleted successfully');
    } catch {
      flash('error', 'Failed to delete rule');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  function handleEdit(id: string) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setDraft({
      appName: rule.appName,
      category: rule.category,
      keywords: rule.keywords?.join(', ') ?? '',
      isAutomatic: rule.isAutomatic,
    });
    setEditingId(id);
  }

  async function handleSaveEdit() {
    if (!editingId) return;

    const parsedKeywords = parseKeywords(draft.keywords);

    if (!draft.isAutomatic && parsedKeywords.length === 0) {
      flash('warning', 'Manual rules must include at least one keyword');
      return;
    }

    try {
      const patch = {
        category: draft.category,
        keywords: draft.isAutomatic ? [] : parsedKeywords,
        isAutomatic: draft.isAutomatic,
      };

      const updated = await api.updateCategoryRule(editingId, patch);
      setRules((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      setEditingId(null);
      setDraft({ ...EMPTY_DRAFT });
      flash('success', 'Rule updated successfully');
    } catch {
      flash('error', 'Failed to update rule');
    }
  }

  async function handleSaveAdd() {
    if (!draft.appName.trim()) {
      flash('warning', 'Application name is required');
      return;
    }

    const parsedKeywords = parseKeywords(draft.keywords);

    if (!draft.isAutomatic && parsedKeywords.length === 0) {
      flash('warning', 'Manual rules must include at least one keyword');
      return;
    }

    try {
      const created = await api.createCategoryRule({
        appName: draft.appName.trim(),
        category: draft.category,
        keywords: draft.isAutomatic ? [] : parsedKeywords,
        isAutomatic: draft.isAutomatic,
      });

      setRules((prev) => [...prev, created]);
      setIsAdding(false);
      setDraft({ ...EMPTY_DRAFT });
      flash('success', `Rule for "${created.appName}" added`);
    } catch {
      flash('error', 'Failed to add rule');
    }
  }

  function handleCancel() {
    setEditingId(null);
    setIsAdding(false);
    setDraft({ ...EMPTY_DRAFT });
  }

  function handleStartAdd() {
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
    setIsAdding(true);
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0f]">
      <FlashContainer messages={messages} onDismiss={dismiss} />
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Category Rules</h1>
            <p className="text-xs text-white mt-0.5">
              Manage application categorization
            </p>
          </div>
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {/* Category Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                      <p className="text-xs text-white">{count} rules</p>
                    </div>
                  </div>
                  <FolderTree className="w-4 h-4 text-white" />
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
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                    Keywords
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
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
                        value={draft.appName}
                        onChange={(e) => setDraft((d) => ({ ...d, appName: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={draft.category}
                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as CategoryRule['category'] }))}
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        placeholder={draft.isAutomatic ? 'Not used for automatic rules' : 'e.g. googledocs, youtube'}
                        value={draft.keywords}
                        onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
                        disabled={draft.isAutomatic}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-indigo-500 ${
                          draft.isAutomatic
                            ? 'bg-white/5 border-white/5 text-gray-500 placeholder-gray-600 cursor-not-allowed'
                            : 'bg-black border-white/10 text-white placeholder-gray-600'
                        }`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={draft.isAutomatic ? 'auto' : 'manual'}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            isAutomatic: e.target.value === 'auto',
                            keywords: e.target.value === 'auto' ? '' : d.keywords,
                          }))
                        }
                        className="px-2 py-0.5 bg-black border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="auto">Automatic</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleSaveAdd}
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
                            value={draft.category}
                            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as CategoryRule['category'] }))}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded"
                              style={{ backgroundColor: categoryColors[rule.category] }}
                            />
                            <span className="text-xs text-white">{rule.category}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.keywords}
                            onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
                            placeholder={draft.isAutomatic ? 'Not used for automatic rules' : 'e.g. googledocs, youtube'}
                            disabled={draft.isAutomatic}
                            className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-indigo-500 ${
                              draft.isAutomatic
                                ? 'bg-white/5 border-white/5 text-gray-500 placeholder-gray-600 cursor-not-allowed'
                                : 'bg-white/5 border-white/10 text-white placeholder-gray-600'
                            }`}
                          />
                        ) : (
                          <span className="text-xs text-white">
                            {rule.keywords?.join(', ') || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select
                            value={draft.isAutomatic ? 'auto' : 'manual'}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                isAutomatic: e.target.value === 'auto',
                                keywords: e.target.value === 'auto' ? '' : d.keywords,
                              }))
                            }
                            className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="auto">Automatic</option>
                            <option value="manual">Manual</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              rule.isAutomatic
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-gray-500/10 text-white'
                            }`}
                          >
                            {rule.isAutomatic ? 'Automatic' : 'Manual'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSaveEdit}
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
                              onClick={() => setDeletingId(rule.id)}
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
              <p className="text-xs text-white leading-relaxed">
                <strong className="text-white">Automatic rules</strong> set the default category for an application.
                <strong className="text-white"> Manual rules</strong> act as overrides for that application when keywords match the
                page title, URL, or site name. For example, you can set Firefox to Entertainment by default, but use a manual
                keyword like <span className="text-white">googledocs</span> to classify Google Docs as Work.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent className="bg-[#111827] border border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-sm text-red-400">Delete rule?</DialogTitle>
            <DialogDescription className="text-xs text-white">
              This will permanently remove the rule for{' '}
              <span className="text-white font-medium">
                {rules.find((r) => r.id === deletingId)?.appName ?? ''}
              </span>
              . The change will apply to new activity tracking immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/15"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="text-xs"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
