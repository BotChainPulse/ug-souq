import { useEffect, useState } from "react";
import { API_BASE } from "../api";

interface Stats {
  totalSellers: number;
  totalListings: number;
  totalOrders: number;
  pendingPayouts: number;
  activeDeliveries: number;
  returnRequests: number;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={styles.container}><p>Loading stats…</p></div>;
  if (error) return <div style={styles.container}><p style={{color:"red"}}>Error: {error}</p></div>;

  const s = stats || {
    totalSellers: 0,
    totalListings: 0,
    totalOrders: 0,
    pendingPayouts: 0,
    activeDeliveries: 0,
    returnRequests: 0,
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Overview</h2>

      <div style={styles.grid}>
        <StatCard label="Total Sellers" value={String(s.totalSellers)} />
        <StatCard label="Total Listings" value={String(s.totalListings)} />
        <StatCard label="Total Orders" value={String(s.totalOrders)} />
        <StatCard label="Pending Payouts" value={String(s.pendingPayouts)} />
        <StatCard label="Active Deliveries" value={String(s.activeDeliveries)} />
        <StatCard label="Return Requests" value={String(s.returnRequests)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #e5e5e5",
  },
  cardLabel: {
    fontSize: "14px",
    color: "#777",
  },
  cardValue: {
    fontSize: "24px",
    fontWeight: "700",
    marginTop: "10px",
  },
};
