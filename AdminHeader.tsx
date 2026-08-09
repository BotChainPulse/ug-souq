export default function AdminHeader() {
  return (
    <div style={styles.header}>
      <h3 style={styles.title}>Admin Dashboard</h3>

      <div style={styles.right}>
        <div style={styles.status}>System OK</div>
        <div style={styles.avatar}>UG</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: "60px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e5e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  status: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#1e1e2f",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    fontSize: "14px",
  },
};
