import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Plus, Edit2, Trash2, Save, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlashContainer, useFlash } from '@/components/ui/alert';
import * as api from '../api';
import { categoryColors, DEFAULT_CATEGORY_COLOR } from '../constants';
import type {
  CategoryRule,
  ProductivityType,
  CategoryDefinition,
  RuleCondition,
  RuleMatchMode,
} from '../types';

type RuleEditorMode = 'simple' | 'advanced';

type RuleDraft = {
  appName: string;
  category: CategoryRule['category'];
  keywords: string;
  isAutomatic: boolean;
  editorMode: RuleEditorMode;
  matchMode: RuleMatchMode;
  conditions: RuleCondition[];
};

function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function normalizeCategoryName(value: string): string {
  return value.trim();
}

function normalizeConditions(conditions: RuleCondition[]): RuleCondition[] {
  return conditions
    .map((condition) => ({
      field: 'windowTitle' as const,
      operator: 'contains' as const,
      value: condition.value.trim(),
    }))
    .filter((condition) => condition.value.length > 0);
}

function inferEditorMode(rule: CategoryRule): RuleEditorMode {
  return (rule.conditions?.length ?? 0) > 0 ? 'advanced' : 'simple';
}

const EMPTY_DRAFT: RuleDraft = {
  appName: '',
  category: 'Deep Work' as CategoryRule['category'],
  keywords: '',
  isAutomatic: false,
  editorMode: 'simple',
  matchMode: 'any',
  conditions: [
    {
      field: 'windowTitle',
      operator: 'contains',
      value: '',
    },
  ],
};

export function Categories() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>({ ...EMPTY_DRAFT });
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { messages, flash, dismiss } = useFlash();

  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>([]);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#8b5cf6');
  const [newCategoryProductivityType, setNewCategoryProductivityType] =
    useState<ProductivityType>('neutral');

  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);
  const [editCategoryColor, setEditCategoryColor] = useState('#8b5cf6');
  const [editCategoryProductivityType, setEditCategoryProductivityType] =
    useState<ProductivityType>('neutral');

  const [deletingCategoryName, setDeletingCategoryName] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const defaultCategories = [
    'Deep Work',
    'Study',
    'Communication',
    'Meetings',
    'Admin',
    'Entertainment',
    'Gaming',
    'Uncategorized',
    'ChronoLog',
  ];

  const builtInCategorySet = new Set(defaultCategories);

  const customCategories = useMemo(
    () => categoryDefinitions.map((c) => c.name),
    [categoryDefinitions],
  );

  const categoryColorMap = useMemo(
    () => Object.fromEntries(categoryDefinitions.map((c) => [c.name, c.color])),
    [categoryDefinitions],
  );

  const categoryProductivityMap = useMemo(
    () => Object.fromEntries(categoryDefinitions.map((c) => [c.name, c.productivityType])),
    [categoryDefinitions],
  );

  const categories = useMemo(() => {
    const fromRules = rules
      .map((r) => r.category?.trim())
      .filter(Boolean) as string[];

    return Array.from(new Set([...defaultCategories, ...customCategories, ...fromRules]));
  }, [rules, customCategories]);

  const groupedRules = useMemo(() => {
    const map = new Map<string, CategoryRule[]>();

    for (const rule of rules) {
      const key = rule.appName.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rule);
    }

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([appName, appRules]) => ({
        appName,
        rules: [...appRules].sort((a, b) => {
          if (a.isAutomatic !== b.isAutomatic) return a.isAutomatic ? 1 : -1;
          return a.category.localeCompare(b.category);
        }),
      }));
  }, [rules]);

  useEffect(() => {
    void Promise.all([api.getCategoryRules(), api.getCategories()])
      .then(([loadedRules, loadedCategories]) => {
        setRules(loadedRules);
        setCategoryDefinitions(loadedCategories);
      })
      .catch(() => flash('error', 'Failed to load category data'));
  }, []);

  function resetDraft(): RuleDraft {
    return {
      ...EMPTY_DRAFT,
      conditions: EMPTY_DRAFT.conditions.map((condition) => ({ ...condition })),
    };
  }

  function addCondition() {
    setDraft((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          field: 'windowTitle',
          operator: 'contains',
          value: '',
        },
      ],
    }));
  }

  function updateCondition(index: number, patch: Partial<RuleCondition>) {
    setDraft((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) =>
        i === index
          ? {
              ...condition,
              ...patch,
              field: 'windowTitle',
              operator: 'contains',
            }
          : condition
      ),
    }));
  }

  function removeCondition(index: number) {
    setDraft((prev) => ({
      ...prev,
      conditions:
        prev.conditions.length <= 1
          ? [
              {
                field: 'windowTitle',
                operator: 'contains',
                value: '',
              },
            ]
          : prev.conditions.filter((_, i) => i !== index),
    }));
  }

  function toggleAppExpanded(appName: string) {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appName)) {
        next.delete(appName);
      } else {
        next.add(appName);
      }
      return next;
    });
  }

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

    const inferredMode = inferEditorMode(rule);

    setDraft({
      appName: rule.appName,
      category: rule.category,
      keywords: rule.keywords?.join(', ') ?? '',
      isAutomatic: rule.isAutomatic,
      editorMode: inferredMode,
      matchMode: rule.matchMode ?? 'any',
      conditions:
        rule.conditions && rule.conditions.length > 0
          ? rule.conditions.map((condition) => ({
              field: 'windowTitle',
              operator: 'contains',
              value: condition.value,
            }))
          : [
              {
                field: 'windowTitle',
                operator: 'contains',
                value: '',
              },
            ],
    });

    setEditingId(id);
    setExpandedApps((prev) => new Set(prev).add(rule.appName));
  }

  async function handleSaveEdit() {
    if (!editingId) return;

    const parsedKeywords = parseKeywords(draft.keywords);
    const normalizedConditions = normalizeConditions(draft.conditions);
    const resolvedCategory = normalizeCategoryName(draft.category);

    if (!resolvedCategory) {
      flash('warning', 'Category is required');
      return;
    }

    if (!draft.isAutomatic) {
      const hasSimpleMatch = draft.editorMode === 'simple' && parsedKeywords.length > 0;
      const hasAdvancedMatch =
        draft.editorMode === 'advanced' && normalizedConditions.length > 0;

      if (!hasSimpleMatch && !hasAdvancedMatch) {
        flash('warning', 'Manual rules must include at least one keyword or advanced condition');
        return;
      }
    }

    try {
      const patch: Partial<CategoryRule> = {
        category: resolvedCategory,
        isAutomatic: draft.isAutomatic,
      };

      if (draft.isAutomatic) {
        patch.keywords = [];
        patch.matchMode = 'any';
        patch.conditions = [];
      } else if (draft.editorMode === 'simple') {
        patch.keywords = parsedKeywords;
        patch.matchMode = 'any';
        patch.conditions = [];
      } else {
        patch.keywords = [];
        patch.matchMode = draft.matchMode;
        patch.conditions = normalizedConditions;
      }

      const updated = await api.updateCategoryRule(editingId, patch);
      setRules((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      setEditingId(null);
      setDraft(resetDraft());
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
    const normalizedConditions = normalizeConditions(draft.conditions);
    const resolvedCategory = normalizeCategoryName(draft.category);

    if (!resolvedCategory) {
      flash('warning', 'Category is required');
      return;
    }

    if (!draft.isAutomatic) {
      const hasSimpleMatch = draft.editorMode === 'simple' && parsedKeywords.length > 0;
      const hasAdvancedMatch =
        draft.editorMode === 'advanced' && normalizedConditions.length > 0;

      if (!hasSimpleMatch && !hasAdvancedMatch) {
        flash('warning', 'Manual rules must include at least one keyword or advanced condition');
        return;
      }
    }

    try {
      const created = await api.createCategoryRule({
        appName: draft.appName.trim(),
        category: resolvedCategory,
        isAutomatic: draft.isAutomatic,
        keywords:
          draft.isAutomatic || draft.editorMode === 'advanced' ? [] : parsedKeywords,
        matchMode:
          draft.isAutomatic || draft.editorMode === 'simple' ? 'any' : draft.matchMode,
        conditions:
          draft.isAutomatic || draft.editorMode === 'simple' ? [] : normalizedConditions,
      });

      setRules((prev) => [...prev, created]);
      setExpandedApps((prev) => new Set(prev).add(created.appName));
      setIsAdding(false);
      setDraft(resetDraft());
      flash('success', `Rule for "${created.appName}" added`);
    } catch {
      flash('error', 'Failed to add rule');
    }
  }

  function handleCancel() {
    setEditingId(null);
    setIsAdding(false);
    setDraft(resetDraft());
  }

  function handleStartAdd() {
    setDraft((prev) => ({
      ...resetDraft(),
      appName: prev.appName,
      category: categories.includes(prev.category) ? prev.category : EMPTY_DRAFT.category,
    }));
    setEditingId(null);
    setIsAdding(true);
  }

  function handleStartEditCategory(categoryName: string) {
    const category = categoryDefinitions.find((c) => c.name === categoryName);
    if (!category) return;

    setEditingCategory(category);
    setEditCategoryColor(category.color);
    setEditCategoryProductivityType(category.productivityType);
  }

  async function handleCreateCategory() {
    const normalized = normalizeCategoryName(newCategoryName);

    if (!normalized) {
      flash('warning', 'Category name is required');
      return;
    }

    if (categories.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      flash('warning', 'That category already exists');
      return;
    }

    try {
      const created = await api.createCategory({
        name: normalized,
        color: newCategoryColor,
        productivityType: newCategoryProductivityType,
      });

      setCategoryDefinitions((prev) => [...prev, created]);
      setDraft((d) => ({ ...d, category: created.name as CategoryRule['category'] }));
      setNewCategoryName('');
      setNewCategoryColor('#8b5cf6');
      setNewCategoryProductivityType('neutral');
      setIsCategoryDialogOpen(false);
      flash('success', `Category "${created.name}" created`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      flash('error', message);
    }
  }

  async function handleSaveCategoryEdit() {
    if (!editingCategory) return;

    try {
      const updated = await api.updateCategory({
        name: editingCategory.name,
        color: editCategoryColor,
        productivityType: editCategoryProductivityType,
      });

      setCategoryDefinitions((prev) =>
        prev.map((c) => (c.name === editingCategory.name ? updated : c))
      );

      setEditingCategory(null);
      flash('success', `Category "${updated.name}" updated`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      flash('error', message);
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategoryName) return;

    if (builtInCategorySet.has(deletingCategoryName)) {
      flash('warning', 'Built-in categories cannot be deleted');
      setDeletingCategoryName(null);
      return;
    }

    setIsDeletingCategory(true);
    try {
      await api.deleteCategory(deletingCategoryName);
      setCategoryDefinitions((prev) =>
        prev.filter((c) => c.name !== deletingCategoryName)
      );
      setDeletingCategoryName(null);
      flash('success', `Category "${deletingCategoryName}" deleted`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      flash('error', message);
    } finally {
      setIsDeletingCategory(false);
    }
  }

function renderRuleBuilder(isEditingRule: boolean) {
  const canShowManualOptions = !draft.isAutomatic;

  return (
    <div className="space-y-3 text-white [&_*]:text-inherit">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Rule mode</span>

        <button
          type="button"
          onClick={() =>
            setDraft((prev) => ({
              ...prev,
              editorMode: 'simple',
              matchMode: 'any',
              conditions:
                prev.conditions.length > 0
                  ? prev.conditions
                  : [{ field: 'windowTitle', operator: 'contains', value: '' }],
            }))
          }
          disabled={!canShowManualOptions}
          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
            !canShowManualOptions
              ? 'bg-white/5 text-gray-600 cursor-not-allowed'
              : draft.editorMode === 'simple'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          Simple
        </button>

        <button
          type="button"
          onClick={() =>
            setDraft((prev) => ({
              ...prev,
              editorMode: 'advanced',
              conditions:
                prev.conditions.length > 0
                  ? prev.conditions
                  : [{ field: 'windowTitle', operator: 'contains', value: '' }],
            }))
          }
          disabled={!canShowManualOptions}
          className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
            !canShowManualOptions
              ? 'bg-white/5 text-gray-600 cursor-not-allowed'
              : draft.editorMode === 'advanced'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          Advanced
        </button>
      </div>

      {draft.isAutomatic ? (
        <div className="text-[11px] text-gray-500">
          Automatic rules do not use keywords or advanced conditions.
        </div>
      ) : draft.editorMode === 'simple' ? (
        <input
          type="text"
          placeholder="e.g. googledocs, youtube"
          value={draft.keywords}
          onChange={(e) => setDraft((d) => ({ ...d, keywords: e.target.value }))}
          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Match mode
            </span>

            <select
              value={draft.matchMode}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  matchMode: e.target.value as RuleMatchMode,
                }))
              }
              className="px-2 py-1 bg-black border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="any">Match any title condition</option>
              <option value="all">Match all title conditions</option>
            </select>
          </div>

          <div className="space-y-2">
            {draft.conditions.map((condition, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto] gap-2 items-center"
              >
                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(index, {
                      value: e.target.value,
                    })
                  }
                  placeholder="Window title contains..."
                  className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Remove condition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCondition}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add title condition
          </button>

          <p className="text-[11px] text-gray-500">
            Advanced rules currently match against the window title only. This is the most reliable cross-browser signal.
          </p>
        </div>
      )}

      {isEditingRule && !draft.isAutomatic && draft.editorMode === 'simple' && (
        <p className="text-[11px] text-gray-500">
          Simple rules match if any keyword appears in the window title.
        </p>
      )}
    </div>
  );
}

function renderRuleSummary(rule: CategoryRule) {
  if (rule.isAutomatic) {
    return <span className="text-xs text-white">—</span>;
  }

  if ((rule.conditions?.length ?? 0) > 0) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
          Advanced · {(rule.matchMode ?? 'any') === 'all' ? 'All' : 'Any'}
        </p>
        {rule.conditions?.map((condition, index) => (
          <p key={index} className="text-xs text-white">
            Title contains "{condition.value}"
          </p>
        ))}
      </div>
    );
  }

  return (
    <span className="text-xs text-white">
      {rule.keywords?.join(', ') || '—'}
    </span>
  );
}

return (
  <div className="flex-1 overflow-auto bg-[#0a0a0f]">
    <FlashContainer messages={messages} onDismiss={dismiss} />

    <div className="border-b border-white/5 px-4 sm:px-8 py-4 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Category Rules</h1>
          <p className="text-xs text-white mt-0.5">
            Manage application categorization
          </p>
        </div>
      </div>
    </div>

    <div className="p-4 sm:p-6">
      <div className="mb-6 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-5 text-white [&_*]:text-inherit">
        <div className="flex gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-lg">
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">How Category Rules Work</h3>
            <div className="text-xs leading-relaxed space-y-2">
              <p>
                Rules are applied separately for each application.
              </p>
              <p>
                <strong>Automatic rules</strong> set the default category for an app and are only used when no manual rule matches.
              </p>
              <p>
                <strong>Simple manual rules</strong> use keywords. A simple rule matches when any keyword appears in the window title.
              </p>
              <p>
                <strong>Advanced manual rules</strong> use multiple window title conditions. You can choose whether the rule matches when <strong>Any</strong> title condition matches or only when <strong>All</strong> title conditions match.
              </p>
              <p>
                When multiple manual rules could match, ChronoLog uses this priority order:
                <br />
                <strong>Advanced (All)</strong> → <strong>Advanced (Any)</strong> → <strong>Simple</strong> → <strong>Automatic</strong>.
              </p>
              <p>
                If two rules are in the same priority tier, the more specific rule should win. For advanced rules, that means more title conditions. For simple rules, that means more keywords.
              </p>
              <p>
                Advanced rules currently use <strong>window title only</strong>, because that is the most reliable cross-browser signal.
              </p>
              <p>
                Example:
                <br />
                Firefox automatic → Entertainment
                <br />
                Firefox simple keyword “wireshark” → Study
                <br />
                Firefox advanced all: title contains “youtube” + title contains “wireshark” → Deep Work
              </p>
              <p>
                In that example, a YouTube video with “Wireshark” in the title should use the advanced all rule, because it is more specific than the simple keyword rule.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {categories.map((category) => {
          const count = rules.filter((r) => r.category === category).length;

          return (
            <div
              key={category}
              className="bg-[#13131a] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor:
                        categoryColorMap[category] ??
                        categoryColors[category] ??
                        DEFAULT_CATEGORY_COLOR,
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{category}</p>
                    <p className="text-xs text-white">{count} rules</p>
                    <p className="text-[11px] text-gray-400 capitalize">
                      {(categoryProductivityMap[category] ?? 'neutral').replace('_', '-')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEditCategory(category)}
                    className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingCategoryName(category)}
                    disabled={builtInCategorySet.has(category)}
                    title={
                      builtInCategorySet.has(category)
                        ? 'Built-in categories cannot be deleted'
                        : 'Delete category'
                    }
                    className={`p-1 rounded transition-colors ${
                      builtInCategorySet.has(category)
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#13131a] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Application Rules</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoryDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Category
            </button>

            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Application
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Category
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-medium text-white uppercase tracking-wider">
                  Match Details
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
                  <td className="px-5 py-3 align-top">
                    <input
                      type="text"
                      placeholder="Application name"
                      value={draft.appName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, appName: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                    />
                  </td>

                  <td className="px-5 py-3 align-top">
                    <select
                      value={draft.category}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          category: e.target.value as CategoryRule['category'],
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-5 py-3 align-top">
                    {renderRuleBuilder(false)}
                  </td>

                  <td className="px-5 py-3 align-top">
                    <select
                      value={draft.isAutomatic ? 'auto' : 'manual'}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          isAutomatic: e.target.value === 'auto',
                          keywords: e.target.value === 'auto' ? '' : d.keywords,
                          editorMode: d.editorMode,
                        }))
                      }
                      className="px-2 py-0.5 bg-black border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="auto">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </td>

                  <td className="px-5 py-3 align-top">
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

              {groupedRules.map(({ appName, rules: appRules }) => {
                const isExpanded = expandedApps.has(appName);
                const manualCount = appRules.filter((r) => !r.isAutomatic).length;
                const automaticCount = appRules.filter((r) => r.isAutomatic).length;

                return (
                  <>
                    <tr
                      key={`group-${appName}`}
                      className="bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer"
                      onClick={() => toggleAppExpanded(appName)}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                isExpanded ? 'rotate-90' : 'rotate-0'
                              }`}
                            />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white">{appName}</p>
                            <p className="text-[11px] text-gray-400">
                              {appRules.length} rule{appRules.length === 1 ? '' : 's'}
                              {manualCount > 0 ? ` · ${manualCount} manual` : ''}
                              {automaticCount > 0 ? ` · ${automaticCount} automatic` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-gray-600">—</span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-gray-600">—</span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-gray-600">—</span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-gray-500">—</span>
                      </td>
                    </tr>

                    {isExpanded &&
                      appRules.map((rule) => {
                        const isEditing = editingId === rule.id;

                        return (
                          <tr
                            key={rule.id}
                            className={isEditing ? 'bg-indigo-500/5' : 'hover:bg-white/5'}
                          >
                            <td className="px-5 py-3 align-top pl-14">
                              <span className="text-sm font-medium text-white">{rule.appName}</span>
                            </td>

                            <td className="px-5 py-3 align-top">
                              {isEditing ? (
                                <select
                                  value={draft.category}
                                  onChange={(e) =>
                                    setDraft((d) => ({
                                      ...d,
                                      category: e.target.value as CategoryRule['category'],
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded"
                                    style={{
                                      backgroundColor:
                                        categoryColorMap[rule.category] ??
                                        categoryColors[rule.category] ??
                                        DEFAULT_CATEGORY_COLOR,
                                    }}
                                  />
                                  <span className="text-xs text-white">{rule.category}</span>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-3 align-top">
                              {isEditing ? renderRuleBuilder(true) : renderRuleSummary(rule)}
                            </td>

                            <td className="px-5 py-3 align-top">
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

                            <td className="px-5 py-3 align-top">
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
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
      <DialogContent className="bg-[#111827] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-sm text-white">Create new category</DialogTitle>
          <DialogDescription className="text-xs text-white [&_*]:text-inherit">
            Add a custom category that can be used in your application rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-white">Category name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Finance, Social, Admin"
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white">Category color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="h-10 w-14 rounded border border-white/10 bg-black p-1 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: newCategoryColor }}
                />
                <span className="text-xs text-gray-300">{newCategoryColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white">Productivity type</label>
            <select
              value={newCategoryProductivityType}
              onChange={(e) =>
                setNewCategoryProductivityType(e.target.value as ProductivityType)
              }
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="productive">Productive</option>
              <option value="non_productive">Non-productive</option>
              <option value="neutral">Neutral</option>
            </select>
            <p className="text-[11px] text-gray-400">
              This controls how the category affects productivity time, focus score, and productivity switches.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/15"
            onClick={() => {
              setIsCategoryDialogOpen(false);
              setNewCategoryName('');
              setNewCategoryColor('#8b5cf6');
              setNewCategoryProductivityType('neutral');
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="text-xs"
            onClick={handleCreateCategory}
          >
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={!!editingCategory}
      onOpenChange={(open) => {
        if (!open) setEditingCategory(null);
      }}
    >
      <DialogContent className="bg-[#111827] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-sm text-white">Edit category</DialogTitle>
          <DialogDescription className="text-xs text-white [&_*]:text-inherit">
            Update this category’s color and productivity type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-white">Category name</label>
            <input
              type="text"
              value={editingCategory?.name ?? ''}
              readOnly
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white">Category color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editCategoryColor}
                onChange={(e) => setEditCategoryColor(e.target.value)}
                className="h-10 w-14 rounded border border-white/10 bg-black p-1 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: editCategoryColor }}
                />
                <span className="text-xs text-gray-300">{editCategoryColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white">Productivity type</label>
            <select
              value={editCategoryProductivityType}
              onChange={(e) =>
                setEditCategoryProductivityType(e.target.value as ProductivityType)
              }
              className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="productive">Productive</option>
              <option value="non_productive">Non-productive</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/15"
            onClick={() => setEditingCategory(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="text-xs"
            onClick={handleSaveCategoryEdit}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={!!deletingCategoryName}
      onOpenChange={(open) => {
        if (!open) setDeletingCategoryName(null);
      }}
    >
      <DialogContent className="bg-[#111827] border border-red-500/30">
        <DialogHeader>
          <DialogTitle className="text-sm text-red-400">Delete category?</DialogTitle>
          <DialogDescription className="text-xs text-white [&_*]:text-inherit">
            This will permanently remove the category{' '}
            <span className="text-white font-medium">{deletingCategoryName ?? ''}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/15"
            onClick={() => setDeletingCategoryName(null)}
            disabled={isDeletingCategory}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="text-xs"
            onClick={handleDeleteCategory}
            disabled={isDeletingCategory}
          >
            {isDeletingCategory ? 'Deleting…' : 'Yes, delete category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={!!deletingId}
      onOpenChange={(open) => {
        if (!open) setDeletingId(null);
      }}
    >
      <DialogContent className="bg-[#111827] border border-red-500/30">
        <DialogHeader>
          <DialogTitle className="text-sm text-red-400">Delete rule?</DialogTitle>
          <DialogDescription className="text-xs text-white [&_*]:text-inherit">
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
