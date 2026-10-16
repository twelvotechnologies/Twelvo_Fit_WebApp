import { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Wrench,
  ShoppingBag,
  X,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'EQUIPMENT' | 'SUPPLEMENT' | 'ACCESSORY';
  stockOrQuantity: number;
  minThreshold: number;
  unitPrice: number;
  conditionOrExpiry?: string;
  lastServiceOrRestockDate: string;
  status: 'OPTIMAL' | 'LOW_STOCK' | 'NEEDS_SERVICE' | 'OPERATIONAL';
  location: string;
}

const formatINR = (val: number) => '₹ ' + val.toLocaleString('en-IN');

export default function InventoryPage() {
  const { user } = useAuthStore();
  const storageKey = `gymerp_inventory_${user?.tenantId || 'tenant_default'}`;

  // Tenant-scoped persistence, default empty (no fake data)
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to sync inventory:', e);
    }
  }, [items, storageKey]);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'EQUIPMENT' as 'EQUIPMENT' | 'SUPPLEMENT' | 'ACCESSORY',
    stockOrQuantity: 1,
    minThreshold: 2,
    unitPrice: 1000,
    location: '',
    conditionOrExpiry: '',
  });

  const lowStockCount = useMemo(
    () => items.filter((i) => i.status === 'LOW_STOCK' || i.stockOrQuantity <= i.minThreshold).length,
    [items]
  );

  const maintenanceCount = useMemo(
    () => items.filter((i) => i.status === 'NEEDS_SERVICE').length,
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }, [items, categoryFilter, statusFilter, search]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const created: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      sku: newItem.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: newItem.name.trim(),
      category: newItem.category,
      stockOrQuantity: Number(newItem.stockOrQuantity) || 1,
      minThreshold: Number(newItem.minThreshold) || 1,
      unitPrice: Number(newItem.unitPrice) || 0,
      conditionOrExpiry: newItem.conditionOrExpiry.trim() || 'Good condition',
      lastServiceOrRestockDate: new Date().toISOString().split('T')[0],
      status:
        newItem.stockOrQuantity <= newItem.minThreshold
          ? 'LOW_STOCK'
          : newItem.category === 'EQUIPMENT'
          ? 'OPERATIONAL'
          : 'OPTIMAL',
      location: newItem.location.trim() || 'General Gym Floor',
    };

    setItems((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewItem({
      name: '',
      sku: '',
      category: 'EQUIPMENT',
      stockOrQuantity: 1,
      minThreshold: 2,
      unitPrice: 1000,
      location: '',
      conditionOrExpiry: '',
    });
  };

  const handleRestock = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              stockOrQuantity: item.stockOrQuantity + 10,
              status: 'OPTIMAL',
              lastServiceOrRestockDate: new Date().toISOString().split('T')[0],
            }
          : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to remove this inventory item?')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleToggleService = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isNeedsService = item.status === 'NEEDS_SERVICE';
          return {
            ...item,
            status: isNeedsService ? 'OPERATIONAL' : 'NEEDS_SERVICE',
            lastServiceOrRestockDate: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Package className="w-3 h-3" /> Equipment & Pro-Shop Assets
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Inventory Logistics</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
            Inventory & Asset Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track equipment preventive maintenance, supplement stock levels, and pro-shop accessories
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset / Stock Item</span>
        </button>
      </div>

      {/* Warning Alert Banners */}
      {(lowStockCount > 0 || maintenanceCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-3.5 text-amber-800 text-xs">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-bold block">
                  {lowStockCount} items below reorder threshold
                </span>
                <span className="text-amber-700/80 text-[11px]">
                  Pro-shop supplements or accessories need purchase order replenishment.
                </span>
              </div>
            </div>
          )}

          {maintenanceCount > 0 && (
            <div className="p-4 bg-rose-50/80 border border-rose-200/80 rounded-2xl flex items-center gap-3.5 text-rose-800 text-xs">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-bold block">
                  {maintenanceCount} machine requires service inspection
                </span>
                <span className="text-rose-700/80 text-[11px]">
                  Scheduled preventive tune-up required to prevent member downtime.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Asset Lines</span>
            <span className="text-xl font-bold text-slate-900 font-heading">{items.length}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Machines / Equipment</span>
            <span className="text-xl font-bold text-emerald-600 font-heading">
              {items.filter((i) => i.category === 'EQUIPMENT').length}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Supplements & Merch</span>
            <span className="text-xl font-bold text-purple-600 font-heading">
              {items.filter((i) => i.category !== 'EQUIPMENT').length}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">Action Needed</span>
            <span className="text-xl font-bold text-amber-600 font-heading">
              {lowStockCount + maintenanceCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by equipment, SKU, supplement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="EQUIPMENT">Gym Equipment Only</option>
            <option value="SUPPLEMENT">Supplements Only</option>
            <option value="ACCESSORY">Accessories & Apparel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPERATIONAL">Operational / Optimal</option>
            <option value="LOW_STOCK">Low Stock Alert</option>
            <option value="NEEDS_SERVICE">Needs Service</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Item / Asset Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4 text-center">In-Stock / Qty</th>
                <th className="py-3.5 px-4">Valuation / Price</th>
                <th className="py-3.5 px-4">Condition & Expiry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">
                      {items.length === 0
                        ? 'No inventory or assets recorded yet'
                        : 'No matching items found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {items.length === 0
                        ? 'Click "+ Add Asset / Stock Item" above to track machines, supplements, and merchandise.'
                        : 'Try adjusting your search criteria or category filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Item Name & SKU */}
                    <td className="py-3.5 px-5">
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200/60">
                            {item.sku}
                          </span>
                          <span className="text-[10px] text-slate-400">ID: {item.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-700 border border-slate-200/50">
                        {item.category}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600">{item.location}</td>

                    {/* Stock Qty */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-bold text-xs px-2.5 py-0.5 rounded-full ${
                          item.stockOrQuantity <= item.minThreshold
                            ? 'bg-amber-100 text-amber-800 font-extrabold'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.stockOrQuantity}
                      </span>
                    </td>

                    {/* Unit Price */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatINR(item.unitPrice)}
                    </td>

                    {/* Condition or Expiry */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {item.conditionOrExpiry || '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {item.status === 'LOW_STOCK' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : item.status === 'NEEDS_SERVICE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                          <Wrench className="w-3 h-3" /> Service Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3" /> Optimal
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.category === 'EQUIPMENT' ? (
                          <button
                            onClick={() => handleToggleService(item.id)}
                            title={item.status === 'NEEDS_SERVICE' ? 'Mark Operational' : 'Flag Needs Service'}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                              item.status === 'NEEDS_SERVICE'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {item.status === 'NEEDS_SERVICE' ? 'Resolve' : 'Service'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestock(item.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            +10
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          title="Remove item"
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-heading tracking-tight">
                    Register New Asset or Stock Item
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Add gym equipment, sports supplements, or fitness accessories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Item Identity & Category
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Item / Machine Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Precor Elliptical Trainer or BCAA 500g"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800"
                      >
                        <option value="EQUIPMENT">Gym Equipment</option>
                        <option value="SUPPLEMENT">Supplements</option>
                        <option value="ACCESSORY">Accessories</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">SKU / Model Ref</label>
                      <input
                        type="text"
                        placeholder="e.g. EQ-EL-01"
                        value={newItem.sku}
                        onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Floor Location / Rack</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardio Zone or Front Shelf"
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Stock & Valuation
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={newItem.stockOrQuantity}
                        onChange={(e) => setNewItem({ ...newItem, stockOrQuantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold tabular-nums text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Min Alert Threshold</label>
                      <input
                        type="number"
                        min={0}
                        value={newItem.minThreshold}
                        onChange={(e) => setNewItem({ ...newItem, minThreshold: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold tabular-nums text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit Price / Value (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold tabular-nums text-slate-900"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
                    <span className="font-bold">Real-time Threshold Monitoring:</span> When stock falls below the threshold, automated low-stock badges and alerts will trigger on the dashboard.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Register Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
