export default function AdminFooter() {
  return (
    <div style={styles.footer}>
      <span>UG-SOUQ Admin Panel</span>
      <span>© {new Date().getFullYear()} All Rights Reserved</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    height: "50px",
    backgroundColor: "#ffffff",
    borderTop: "1px solid #e5e5e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    fontSize: "14px",
    color: "#555",
  },
};
