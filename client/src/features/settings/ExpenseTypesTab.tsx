import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  ReceiptText,
} from 'lucide-react';
import {
  getExpenseTypes,
  createExpenseType,
  updateExpenseType,
  toggleExpenseTypeStatus,
  deleteExpenseType,
} from '../../api/expensesApi';
import { ExpenseTypeItem, CreateExpenseTypeInput } from '../../api/types';

export default function ExpenseTypesTab() {
  const [types, setTypes] = useState<ExpenseTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseTypeItem | null>(null);
  const [formData, setFormData] = useState<CreateExpenseTypeInput>({
    name: '',
    description: '',
    isActive: true,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getExpenseTypes();
      setTypes(data);
    } catch (err: any) {
      console.error('Failed to load expense types', err);
      setErrorMsg(err.message || 'Failed to load expense types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenAddModal = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', isActive: true });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ExpenseTypeItem) => {
    setEditingType(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      isActive: item.isActive,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      if (editingType) {
        await updateExpenseType(editingType.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          isActive: formData.isActive,
        });
      } else {
        await createExpenseType({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          isActive: formData.isActive,
        });
      }
      setIsModalOpen(false);
      await fetchTypes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: ExpenseTypeItem) => {
    try {
      await toggleExpenseTypeStatus(item.id);
      setTypes((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, isActive: !t.isActive } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (item: ExpenseTypeItem) => {
    if (item.isSystem) {
      alert('System expense types (such as Staff Salary & Payroll) cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete expense type "${item.name}"?`
    );
    if (!confirmed) return;

    try {
      await deleteExpenseType(item.id);
      setTypes((prev) => prev.filter((t) => t.id !== item.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense type');
    }
  };

  const filteredTypes = types.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6ED]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-[#1A2333]">
              Expense Types & Categories
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8EFFE] text-[#2F6FED]">
              {types.length} Types
            </span>
          </div>
          <p className="text-xs text-[#6B7686] mt-0.5">
            Configure expenditure categories to track gym operational costs, utility bills, and salary payouts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTypes}
            title="Refresh"
            className="p-2 border border-[#E2E6ED] rounded-lg text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F5F7FA] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense Type</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7686]" />
          <input
            type="text"
            placeholder="Search expense types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] focus:bg-white transition-colors"
          />
        </div>
        <span className="text-[11px] text-[#6B7686]">
          Showing {filteredTypes.length} of {types.length} categories
        </span>
      </div>

      {/* Grid of Expense Types */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-[#F5F7FA] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E2E6ED] rounded-xl bg-[#F5F7FA]/50">
          <ReceiptText className="w-8 h-8 text-[#6B7686] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-medium text-[#1A2333]">No expense types found</p>
          <p className="text-[11px] text-[#6B7686] mt-0.5">
            {search ? 'Try clearing your search keyword' : 'Click "Add Expense Type" to create your first category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTypes.map((item) => (
            <div
              key={item.id}
              className={`relative border rounded-xl p-4 transition-all hover:shadow-subtle flex flex-col justify-between ${
                item.isActive
                  ? 'bg-white border-[#E2E6ED]'
                  : 'bg-[#F5F7FA]/60 border-[#E2E6ED]/80 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#1A2333] truncate">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.isSystem ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E8EFFE] text-[#2F6FED]">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            System Default
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#F5F7FA] text-[#6B7686]">
                            Custom
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                            item.isActive
                              ? 'bg-[#E6F4EA] text-[#137333]'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7686] line-clamp-2 mt-1">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-[#E2E6ED] flex items-center justify-between text-[11px]">
                <span className="text-[#6B7686]">
                  {item.expensesCount !== undefined
                    ? `${item.expensesCount} ${item.expensesCount === 1 ? 'expense' : 'expenses'}`
                    : 'Tracked'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(item)}
                    title={item.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1 text-[#6B7686] hover:text-[#1A2333] hover:bg-[#F5F7FA] rounded transition-colors"
                  >
                    {item.isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(item)}
                    title="Edit Type"
                    className="p-1 text-[#6B7686] hover:text-[#2F6FED] hover:bg-[#E8EFFE] rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!item.isSystem && (
                    <button
                      onClick={() => handleDelete(item)}
                      title="Delete Type"
                      className="p-1 text-[#6B7686] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#E2E6ED] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between bg-[#F5F7FA]/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E8EFFE] text-[#2F6FED] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-[#1A2333]">
                    {editingType ? 'Edit Expense Type' : 'Add Expense Type'}
                  </h3>
                  <p className="text-[11px] text-[#6B7686]">
                    {editingType ? 'Update category details' : 'Define a new expenditure category'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#6B7686] hover:text-[#1A2333] hover:bg-[#E2E6ED]/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity, Gym Maintenance, Marketing"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes on what expenses belong in this category..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#2F6FED] rounded border-[#E2E6ED] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-[#1A2333] cursor-pointer">
                  Active (available in expense entry dropdown)
                </label>
              </div>

              <div className="pt-3 border-t border-[#E2E6ED] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingType ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
