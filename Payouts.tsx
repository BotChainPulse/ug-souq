import { useState } from "react";

interface Payout {
  id: string;
  seller: string;
  amount: string;
  status: string;
  reference: string;
  date: string;
}

export default function Payouts() {
  const [payouts] = useState<Payout[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Payouts</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Seller</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Reference</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {payouts.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={6}>No payouts found.</td>
            </tr>
          ) : (
            payouts.map((payout) => (
              <tr key={payout.id}>
                <td style={styles.td}>{payout.id}</td>
                <td style={styles.td}>{payout.seller}</td>
                <td style={styles.td}>{payout.amount}</td>
                <td style={styles.td}>{payout.status}</td>
                <td style={styles.td}>{payout.reference}</td>
                <td style={styles.td}>{payout.date}</td>
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
