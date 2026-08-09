import { useState } from "react";

interface Log {
  id: string;
  action: string;
  actor: string;
  details: string;
  date: string;
}

export default function AuditLog() {
  const [logs] = useState<Log[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Audit Log</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Action</th>
            <th style={styles.th}>Actor</th>
            <th style={styles.th}>Details</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={5}>No audit logs found.</td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td style={styles.td}>{log.id}</td>
                <td style={styles.td}>{log.action}</td>
                <td style={styles.td}>{log.actor}</td>
                <td style={styles.td}>{log.details}</td>
                <td style={styles.td}>{log.date}</td>
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
