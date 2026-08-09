import { useState } from "react";

interface Notification {
  id: string;
  type: string;
  message: string;
  date: string;
}

export default function Notifications() {
  const [notifications] = useState<Notification[]>([]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Notifications</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Message</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {notifications.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={4}>No notifications found.</td>
            </tr>
          ) : (
            notifications.map((note) => (
              <tr key={note.id}>
                <td style={styles.td}>{note.id}</td>
                <td style={styles.td}>{note.type}</td>
                <td style={styles.td}>{note.message}</td>
                <td style={styles.td}>{note.date}</td>
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
