import { useEffect, useState } from "react";
import { API_BASE } from "../api";

interface Listing {
  id: string;
  name: string;
  seller: string;
  price: string;
  stock: number;
  status: string;
}

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/listings`)
      .then((r) => r.json())
      .then((data) => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Listings</h2>

      {loading && <p>Loading listings…</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Product</th>
            <th style={styles.th}>Seller</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Stock</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {listings.length === 0 && !loading ? (
            <tr>
              <td style={styles.td} colSpan={6}>No listings found.</td>
            </tr>
          ) : (
            listings.map((item) => (
              <tr key={item.id}>
                <td style={styles.td}>{item.id}</td>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}>{item.seller}</td>
                <td style={styles.td}>{item.price}</td>
                <td style={styles.td}>{item.stock}</td>
                <td style={styles.td}>{item.status}</td>
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
