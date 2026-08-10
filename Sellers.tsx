import { useEffect, useState } from "react";
import { trpcQuery, trpcMutation } from "../api";

function getAdminKey() {
  return localStorage.getItem("adminKey") || "";
}

export default function Sellers() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchSellers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await trpcQuery("admin.sellers", {
        key: getAdminKey(),
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setSellers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await trpcMutation("admin.setSellerStatus", { key: getAdminKey(), id, status });
      fetchSellers();
    } catch (err: any) {
      alert("Failed: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sellers</h2>
      <div style={styles.toolbar}>
        <input
          placeholder="Search by shop, owner, phone, or district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === "Enter" && fetchSellers()}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.input}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
        <button onClick={fetchSellers} style={styles.btnPrimary}>Search / Refresh</button>
      </div>

      {loading && <p>Loading sellers...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Shop Name</th>
              <th style={styles.th}>Owner</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>District</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Verified</th>
              <th style={styles.th}>Contracts</th>
            </tr>
          </thead>
          <tbody>
            {sellers.length === 0 && !loading ? (
              <tr><td style={styles.td} colSpan={8}>No sellers found.</td></tr>
            ) : (
              sellers.map((s: any) => (
                <tr key={s.id}>
                  <td style={styles.td}>{s.id}</td>
                  <td style={styles.td}>{s.shopName}</td>
                  <td style={styles.td}>{s.ownerName}</td>
                  <td style={styles.td}>{s.phone}</td>
                  <td style={styles.td}>{s.district || "—"}</td>
                  <td style={styles.td}>
                    <select
                      value={s.status}
                      onChange={(e) => handleStatusChange(s.id, e.target.value)}
                      style={{ ...styles.badge, background: statusColor(s.status) }}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    {s.verified ? <span style={{ color: "green", fontWeight: 600 }}>✓ Yes</span> : <span style={{ color: "#999" }}>No</span>}
                  </td>
                  <td style={styles.td}>
                    {s.contracts?.length > 0 ? s.contracts.map((c: any) => c.contractType).join(", ") : "None"}
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
  input: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px", minWidth: "200px" },
  btnPrimary: { padding: "8px 16px", borderRadius: "6px", border: "none", background: "#e8590c", color: "#fff", cursor: "pointer", fontSize: "14px" },
  table: { width: "100%", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e5e5", borderCollapse: "collapse", minWidth: "900px" },
  th: { padding: "12px", borderBottom: "1px solid #e5e5e5", textAlign: "left", backgroundColor: "#f9f9f9", fontWeight: 600, fontSize: "14px", color: "#555" },
  td: { padding: "12px", borderBottom: "1px solid #e5e5e5", fontSize: "14px", color: "#333" },
  badge: { padding: "4px 10px", borderRadius: "12px", border: "1px solid #ccc", fontSize: "12px", cursor: "pointer" },
};
