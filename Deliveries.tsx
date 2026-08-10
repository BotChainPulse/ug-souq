import { useEffect, useState } from "react";
import { trpcQuery, trpcMutation } from "../api";

function getAdminKey() {
  return localStorage.getItem("adminKey") || "";
}

export default function Deliveries() {
  const [partners, setPartners] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trpcQuery("admin.deliveryPartners", {
        key: getAdminKey(),
        search: search || undefined,
      });
      setPartners(data?.partners ?? []);
      setLedger(data?.ledger ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await trpcMutation("admin.setDeliveryPartnerStatus", { key: getAdminKey(), id, status });
      fetchData();
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Delivery Partners</h2>
      <div style={styles.toolbar}>
        <input
          placeholder="Search by name, phone, or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
        />
        <button onClick={fetchData} style={styles.btnPrimary}>Search / Refresh</button>
      </div>

      {ledger && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Delivery Fees (Booked)</div>
            <div style={styles.statValue}>UGX {Number(ledger.deliveryFeesBooked || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Delivery Fees (Realized)</div>
            <div style={styles.statValue}>UGX {Number(ledger.deliveryFeesRealized || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Platform 10% (Booked)</div>
            <div style={styles.statValue}>UGX {Number(ledger.platform10Booked || 0).toLocaleString()}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Partner Share (Booked)</div>
            <div style={styles.statValue}>UGX {Number(ledger.partnerShareBooked || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {loading && <p>Loading partners...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Area</th>
              <th style={styles.th}>Vehicle</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && !loading ? (
              <tr><td style={styles.td} colSpan={6}>No delivery partners found.</td></tr>
            ) : (
              partners.map((p: any) => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.id}</td>
                  <td style={styles.td}>{p.fullName}</td>
                  <td style={styles.td}>{p.phone}</td>
                  <td style={styles.td}>{p.area}</td>
                  <td style={styles.td}>{p.vehicleType || "—"}</td>
                  <td style={styles.td}>
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      style={{ ...styles.badge, background: statusColor(p.status) }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </td>
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
    case "approved": return "#d4edda";
    case "rejected": case "terminated": return "#f8d7da";
    case "suspended": return "#fff3cd";
    default: return "#e2e3e5";
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "20px" },
  title: { fontSize: "24px", fontWeight: 600, marginBottom: "20px" },
  toolbar: { display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" },
  input: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", minWidth: "250px" },
  btnPrimary: { padding: "8px 16px", borderRadius: "6px", border: "none", background: "#e8590c", color: "#fff", cursor: "pointer", fontSize: "14px" },
  statCard: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "16px" },
  statLabel: { fontSize: "12px", color: "#666", marginBottom: "4px" },
  statValue: { fontSize: "18px", fontWeight: 600, color: "#333" },
  table: { width: "100%", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e5e5", borderCollapse: "collapse", minWidth: "700px" },
  th: { padding: "12px", borderBottom: "1px solid #e5e5e5", textAlign: "left", backgroundColor: "#f9f9f9", fontWeight: 600, fontSize: "14px", color: "#555" },
  td: { padding: "12px", borderBottom: "1px solid #e5e5e5", fontSize: "14px", color: "#333" },
  badge: { padding: "4px 10px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "12px", cursor: "pointer" },
};
