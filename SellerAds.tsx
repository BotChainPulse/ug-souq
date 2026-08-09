import { useState } from "react";

interface Ad {
  id: string;
  seller: string;
  type: string;
  duration: string;
  status: string;
  payment: string;
}

export default function SellerAds() {
  const [ads] = useState<Ad[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Seller Ads</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Seller</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Duration</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Payment</th>
          </tr>
        </thead>
        <tbody>
          {ads.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={6}>No ads found.</td>
            </tr>
          ) : (
            ads.map((ad) => (
              <tr key={ad.id}>
                <td style={styles.td}>{ad.id}</td>
                <td style={styles.td}>{ad.seller}</td>
                <td style={styles.td}>{ad.type}</td>
                <td style={styles.td}>{ad.duration}</td>
                <td style={styles.td}>{ad.status}</td>
                <td style={styles.td}>{ad.payment}</td>
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
