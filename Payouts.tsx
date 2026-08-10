import { useState } from "react";
import { trpcQuery, trpcMutation } from "../api";

function getAdminKey() {
  return localStorage.getItem("adminKey") || "";
}

export default function Payouts() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trpcQuery("admin.pendingPayouts", { key: getAdminKey() });
      setPending(data?.pending ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trpcQuery("admin.payoutHistory", { key: getAdminKey(), limit: 100 });
      setHistory(data?.payouts ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (p: any) => {
    if (!confirm(`Pay UGX ${Number(p.total_owed || 0).toLocaleString()} to ${p.seller_name}?`)) return;
    try {
      await trpcMutation("admin.processPayout", {
        key: getAdminKey(),
        sellerId: p.seller_id,
        amount: p.total_owed,
        orderCodes: p.order_codes,
        payoutMethod: p.payout_method || "mobile_money",
        payoutNumber: p.payout_number || "",
        sellerName: p.seller_name,
      });
      alert("Payout processed!");
      fetchPending();
      fetchHistory();
    } catch (err: any) {
      alert("Payout failed: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Payouts</h2>
      <div style={styles.tabs}>
        <button
          onClick={() => { setTab("pending"); fetchPending(); }}
          style={{ ...styles.tab, ...(tab === "pending" ? styles.tabActive : {}) }}
        >
          Pending
        </button>
        <button
          onClick={() => { setTab("history"); fetchHistory(); }}
          style={{ ...styles.tab, ...(tab === "history" ? styles.tabActive : {}) }}
        >
          History
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {tab === "pending" && (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Seller</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Number</th>
                <th style={styles.th}>Orders</th>
                <th style={styles.th}>Total Owed</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && !loading ? (
                <tr><td style={styles.td} colSpan={6}>No pending payouts.</td></tr>
              ) : (
                pending.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td style={styles.td}>{p.seller_name}</td>
                    <td style={styles.td}>{p.payout_method || "Not set"}</td>
                    <td style={styles.td}>{p.payout_number || "—"}</td>
                    <td style={styles.td}>{p.order_count}</td>
                    <td style={styles.td}><strong>UGX {Number(p.total_owed || 0).toLocaleString()}</strong></td>
                    <td style={styles.td}>
                      <button onClick={() => handleProcess(p)} style={styles.btnSuccess}>Pay Now</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Seller</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Reference</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && !loading ? (
                <tr><td style={styles.td} colSpan={7}>No payout history.</td></tr>
              ) : (
                history.map((p: any) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.id}</td>
                    <td style={styles.td}>{p.sellerName || p.seller_id}</td>
                    <td style={styles.td}>UGX {Number(p.amount || 0).toLocaleString()}</td>
                    <td style={styles.td}>{p.payoutMethod}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: p.status === "completed" ? "#d4edda" : p.status === "failed" ? "#f8d7da" : "#fff3cd" }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>{p.reference}</td>
                    <td style={styles.td}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "20px" },
  title: { fontSize: "24px", fontWeight: 600, marginBottom: "20px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { padding: "10px 20px", borderRadius: "6px", border: "1px solid #ddd", background: "#f9f9f9", cursor: "pointer", fontSize: "14px" },
  tabActive: { background: "#e8590c", color: "#fff", borderColor: "#e8590c" },
  table: { width: "100%", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e5e5", borderCollapse: "collapse", minWidth: "700px" },
  th: { padding: "12px", borderBottom: "1px solid #e5e5e5", textAlign: "left", backgroundColor: "#f9f9f9", fontWeight: 600, fontSize: "14px", color: "#555" },
  td: { padding: "12px", borderBottom: "1px solid #e5e5e5", fontSize: "14px", color: "#333" },
  badge: { padding: "4px 10px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "12px" },
  btnSuccess: { padding: "6px 14px", borderRadius: "6px", border: "none", background: "#28a745", color: "#fff", cursor: "pointer", fontSize: "13px" },
};
