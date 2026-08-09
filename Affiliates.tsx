import { useState } from "react";

interface Affiliate {
  id: string;
  name: string;
  referred: number;
  commission: string;
  payoutStatus: string;
  joined: string;
}

export default function Affiliates() {
  const [affiliates] = useState<Affiliate[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Affiliates</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Referred</th>
            <th style={styles.th}>Commission</th>
            <th style={styles.th}>Payout Status</th>
            <th style={styles.th}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {affiliates.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={6}>No affiliates found.</td>
            </tr>
          ) : (
            affiliates.map((aff) => (
              <tr key={aff.id}>
                <td style={styles.td}>{aff.id}</td>
                <td style={styles.td}>{aff.name}</td>
                <td style={styles.td}>{aff.referred}</td>
                <td style={styles.td}>{aff.commission}</td>
                <td style={styles.td}>{aff.payoutStatus}</td>
                <td style={styles.td}>{aff.joined}</td>
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
