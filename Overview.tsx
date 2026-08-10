import { useEffect, useState } from "react";
import { trpcQuery } from "../api";

function getAdminKey() {
  return localStorage.getItem("adminKey") || "";
}

export default function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    trpcQuery("admin.stats", { key: getAdminKey() })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={styles.container}><p>Loading dashboard...</p></div>;
  if (error) return <div style={styles.container}><p style={{ color: "red" }}>Error: {error}</p></div>;
  if (!stats) return <div style={styles.container}><p>No data.</p></div>;

  const cards = [
    { label: "Total Orders", value: stats.orderCount || 0 },
    { label: "Revenue (UGX)", value: (stats.revenue || 0).toLocaleString() },
    { label: "Sellers", value: stats.sellerCount || 0 },
    { label: "Pending Sellers", value: stats.pendingSellers || 0 },
    { label: "Products", value: stats.productCount || 0 },
    { label: "Customers", value: stats.customerCount || 0 },
    { label: "Pending Payouts", value: stats.pendingPayouts || 0 },
    { label: "Unread Notifications", value: stats.unreadNotifications || 0 },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Dashboard Overview</h2>
      <div style={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} style={styles.card}>
            <div style={styles.cardValue}>{c.value}</div>
            <div style={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {stats.ordersByStatus && stats.ordersByStatus.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={styles.subtitle}>Orders by Status</h3>
          <div style={styles.grid}>
            {stats.ordersByStatus.map((s: any) => (
              <div key={s.status} style={styles.card}>
                <div style={styles.cardValue}>{s.count}</div>
                <div style={styles.cardLabel}>{s.status.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "20px" },
  title: { fontSize: "24px", fontWeight: 600, marginBottom: "20px" },
  subtitle: { fontSize: "18px", fontWeight: 600, marginBottom: "15px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "20px", textAlign: "center" },
  cardValue: { fontSize: "28px", fontWeight: 700, color: "#e8590c", marginBottom: "6px" },
  cardLabel: { fontSize: "13px", color: "#666", textTransform: "capitalize" },
};
