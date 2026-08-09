import { useState } from "react";

interface ReturnItem {
  id: string;
  orderId: string;
  buyer: string;
  seller: string;
  reason: string;
  status: string;
  date: string;
}

export default function Returns() {
  const [returns] = useState<ReturnItem[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Returns</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Order</th>
            <th style={styles.th}>Buyer</th>
            <th style={styles.th}>Seller</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {returns.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={7}>No returns found.</td>
            </tr>
          ) : (
            returns.map((ret) => (
              <tr key={ret.id}>
                <td style={styles.td}>{ret.id}</td>
                <td style={styles.td}>{ret.orderId}</td>
                <td style={styles.td}>{ret.buyer}</td>
                <td style={styles.td}>{ret.seller}</td>
                <td style={styles.td}>{ret.reason}</td>
                <td style={styles.td}>{ret.status}</td>
                <td style={styles.td}>{ret.date}</td>
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
