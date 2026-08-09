import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminFooter from "./AdminFooter";

export default function AdminLayout() {
  return (
    <div className="admin-container" style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <AdminHeader />

        <div style={styles.content}>
          <Suspense fallback={<div style={styles.loading}>Loading…</div>}>
            <Outlet />
          </Suspense>
        </div>

        <AdminFooter />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    width: "100%",
    height: "100vh",
    backgroundColor: "#f5f6fa",
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#1e1e2f",
    color: "#fff",
    height: "100%",
    overflowY: "auto",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  content: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  },
  loading: {
    padding: "40px",
    textAlign: "center",
    color: "#888",
    fontSize: "16px",
  },
};
