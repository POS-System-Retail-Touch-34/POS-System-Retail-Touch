import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, User, History, Star, X, Phone, Mail, MapPin, Loader2, Trash2,
} from "lucide-react";
import AddCustomerModal from "./AddCustomerModal";
import useDebounce from "../../hooks/useDebounce";
import * as customerService from "../../services/customerService";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Backend-powered search: empty → top 10 recent; non-empty → name/phone search
  const fetchCustomers = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerService.searchCustomers(query);
      setCustomers(data ?? []);
    } catch {
      setError("Failed to load customers. Is the API running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and re-fetch when debounced search changes
  useEffect(() => {
    fetchCustomers(debouncedQ);
  }, [debouncedQ, fetchCustomers]);

  const tierColors = {
    Platinum: "badge-primary", Gold: "badge-warning", Silver: "badge-gray", Bronze: "badge-danger",
  };
  const tierBg = {
    Platinum: "from-primary-400 to-primary-600",
    Gold: "from-amber-400 to-yellow-600",
    Silver: "from-gray-400 to-gray-500",
    Bronze: "from-orange-400 to-red-500",
  };

  const handleAddCustomer = async (customer) => {
    setCustomers(prev => [customer, ...prev]);
    setShowAdd(false);
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customerService.deleteCustomer(deleteTarget.id);
      setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast.success("Customer deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete customer");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openHistory = async (customer) => {
    setSelected(customer);
    setHistLoading(true);
    setHistory([]);
    setShowHistory(true);
    try {
      const data = await customerService.getPurchaseHistory(customer.id);
      setHistory(data ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {customers.length} {q ? "matching" : "recent"} customers
          </p>
        </div>
        <button className="btn-primary btn gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Backend-powered search with debounce */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9 max-w-md"
          placeholder="Search by name or phone number…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading customers…
        </div>
      )}
      {error && <div className="text-center py-16 text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <div key={c.id} className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${tierBg[c.tier] || "from-gray-400 to-gray-500"} rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {c.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold dark:text-white truncate">{c.name}</div>
                  {c.tier && (
                    <span className={`badge ${tierColors[c.tier] || "badge-gray"}`}>{c.tier}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{c.phone}</div>}
                {c.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
                {c.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{c.address}</span></div>}
              </div>

              {/* Loyalty Points — display only; auto-updated during sales */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-900/50 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold dark:text-white">
                    {c.loyaltyPoints ?? 0} pts
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Redeem at checkout</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-900/50 rounded-xl p-3">
                <div>
                  <div className="text-gray-400">Total Purchases</div>
                  <div className="font-semibold dark:text-white">{c.totalPurchases ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-400">Total Spent</div>
                  <div className="font-semibold dark:text-white">{formatCurrency(c.totalSpent ?? 0)}</div>
                </div>
                {c.lastPurchaseDate && (
                  <div className="col-span-2">
                    <div className="text-gray-400">Last Purchase</div>
                    <div className="font-semibold dark:text-white">
                      {new Date(c.lastPurchaseDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              <button className="btn-secondary btn text-sm gap-2" onClick={() => openHistory(c)}>
                <History className="w-4 h-4" /> View Purchase History
              </button>
              <button
                className="btn-ghost btn text-sm gap-2 hover:text-red-500"
                onClick={() => setDeleteTarget(c)}
              >
                <Trash2 className="w-4 h-4" /> Delete Customer
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-semibold">No customers found</div>
          {q && <div className="text-sm mt-1">Try a different search term</div>}
        </div>
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAddCustomer}
        />
      )}

      {showHistory && selected && (
        <PurchaseHistoryModal
          customer={selected}
          history={history}
          loading={histLoading}
          onClose={() => setShowHistory(false)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCustomer}
        loading={deleting}
      />
    </div>
  );
}

/**
 * PurchaseHistoryModal uses the real Transaction entity field names:
 *   invoiceNumber, timestamp, items[].productName, items[].quantity, items[].unitPrice, total
 */
function PurchaseHistoryModal({ customer, history, loading, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Purchase History</h2>
            <p className="text-sm text-gray-400">{customer.name}</p>
          </div>
          <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading history…
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No purchase history found</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {history.map(txn => (
              <div key={txn.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-900/50">
                  <span className="font-semibold text-sm dark:text-white font-mono">
                    {txn.invoiceNumber || txn.id}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(txn.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-1">
                  {(txn.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.productName} ×{item.quantity}
                      </span>
                      <span className="font-medium dark:text-white">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-100 dark:border-gray-700 dark:text-white">
                    <span>Total</span>
                    <span>{formatCurrency(txn.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

