import { useState } from "react";

interface Delivery {
  id: string;
  partner: string;
  orderId: string;
  status: string;
  fee: string;
  date: string;
}

export default function Deliveries() {
  const [deliveries] = useState<Delivery[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Deliveries</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Partner</th>
            <th style={styles.th}>Order</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Fee</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={6}>No deliveries found.</td>
            </tr>
          ) : (
            deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td style={styles.td}>{delivery.id}</td>
                <td style={styles.td}>{delivery.partner}</td>
                <td style={styles.td}>{delivery.orderId}</td>
                <td style={styles.td}>{delivery.status}</td>
                <td style={styles.td}>{delivery.fee}</td>
                <td style={styles.td}>{delivery.date}</td>
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
