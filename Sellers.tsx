import { useEffect, useState } from "react";
import { API_BASE } from "../api";

interface Seller {
  id: string;
  name: string;
  phone: string;
  status: string;
  totalListings: number;
}

export default function Sellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/sellers`)
      .then((r) => r.json())
      .then((data) => {
        setSellers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sellers</h2>

      {loading && <p>Loading sellers…</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Listings</th>
          </tr>
        </thead>
        <tbody>
          {sellers.length === 0 && !loading ? (
            <tr>
              <td style={styles.td} colSpan={5}>No sellers found.</td>
            </tr>
          ) : (
            sellers.map((seller) => (
              <tr key={seller.id}>
                <td style={styles.td}>{seller.id}</td>
                <td style={styles.td}>{seller.name}</td>
                <td style={styles.td}>{seller.phone}</td>
                <td style={styles.td}>{seller.status}</td>
                <td style={styles.td}>{seller.totalListings}</td>
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
