import { useEffect, useState } from "react";
import { API_BASE } from "../api";

interface Order {
  id: string;
  buyer: string;
  seller: string;
  total: string;
  status: string;
  items: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/orders`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Orders</h2>

      {loading && <p>Loading orders…</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Buyer</th>
            <th style={styles.th}>Seller</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Items</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && !loading ? (
            <tr>
              <td style={styles.td} colSpan={6}>No orders found.</td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td style={styles.td}>{order.id}</td>
                <td style={styles.td}>{order.buyer}</td>
                <td style={styles.td}>{order.seller}</td>
                <td style={styles.td}>{order.total}</td>
                <td style={styles.td}>{order.status}</td>
                <td style={styles.td}>{order.items}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "10px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  table: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e5e5e5",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px",
    borderBottom: "1px solid #e5e5e5",
    textAlign: "left",
    backgroundColor: "#f9f9f9",
    fontWeight: 600,
    fontSize: "14px",
    color: "#555",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e5e5",
    fontSize: "14px",
    color: "#333",
  },
};
