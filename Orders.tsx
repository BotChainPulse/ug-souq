import { useEffect, useState } from "react";
import { trpcQuery, trpcMutation } from "../api";

const STATUS_OPTIONS = [
  "placed", "confirmed", "pending_delivery", "on_the_way", "delivered", "cancelled"
] as const;

const PAYMENT_OPTIONS = ["unpaid", "pending_confirmation", "paid"] as const;

function getAdminKey() {
  return localStorage.getItem("adminKey") || "";
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trpcQuery("admin.orders", {
        key: getAdminKey(),
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await trpcMutation("admin.setOrderStatus", { key: getAdminKey(), id, status });
      fetchOrders();
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  const handlePaymentChange = async (id: number, status: string) => {
    try {
      await trpcMutation("admin.setPaymentStatus", { key: getAdminKey(), id, status });
      fetchOrders();
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Orders</h2>
      <div style={styles.toolbar}>
        <input
          placeholder="Search by code or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.input}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button onClick={fetchOrders} style={styles.btnPrimary}>Search / Refresh</button>
      </div>

      {loading && <p>Loading orders...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !loading ? (
              <tr><td style={styles.td} colSpan={8}>No orders found.</td></tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order.id}>
                  <td style={styles.td}><strong>{order.code}</strong></td>
                  <td style={styles.td}>{order.customerName || "—"}</td>
                  <td style={styles.td}>{order.phone || "—"}</td>
                  <td style={styles.td}>{order.address || "—"}</td>
                  <td style={styles.td}>UGX {Number(order.total || 0).toLocaleString()}</td>
                  <td style={styles.td}>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ ...styles.badge, background: statusColor(order.status) }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <select
                      value={order.paymentStatus || "unpaid"}
                      onChange={(e) => handlePaymentChange(order.id, e.target.value)}
                      style={{ ...styles.badge, background: paymentColor(order.paymentStatus) }}
                    >
                      {PAYMENT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>{order.items?.length || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "delivered": return "#d4edda";
    case "cancelled": return "#f8d7da";
    case "on_the_way": return "#cce5ff";
    case "confirmed": return "#d1ecf1";
    case "pending_delivery": return "#fff3cd";
    default: return "#e2e3e5";
  }
}

function paymentColor(status: string) {
  switch (status) {
    case "paid": return "#d4edda";
    case "pending_confirmation": return "#fff3cd";
    default: return "#f8d7da";
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "20px" },
  title: { fontSize: "24px", fontWeight: 600, marginBottom: "20px" },
  toolbar: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  input: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", minWidth: "180px" },
  btnPrimary: { padding: "8px 16px", borderRadius: "6px", border: "none", background: "#e8590c", color: "#fff", cursor: "pointer", fontSize: "14px" },
  table: { width: "100%", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e5e5", borderCollapse: "collapse", minWidth: "800px" },
  th: { padding: "12px", borderBottom: "1px solid #e5e5e5", textAlign: "left", backgroundColor: "#f9f9f9", fontWeight: 600, fontSize: "14px", color: "#555" },
  td: { padding: "12px", borderBottom: "1px solid #e5e5e5", fontSize: "14px", color: "#333" },
  badge: { padding: "4px 10px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "12px", cursor: "pointer" },
};
