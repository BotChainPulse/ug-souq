import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  return (
    <div style={styles.sidebar}>
      <h2 style={styles.title}>UG-SOUQ Admin</h2>

      <nav style={styles.nav}>
        <SidebarLink to="/admin" label="Overview" />
        <SidebarLink to="/admin/sellers" label="Sellers" />
        <SidebarLink to="/admin/listings" label="Listings" />
        <SidebarLink to="/admin/orders" label="Orders" />
        <SidebarLink to="/admin/payouts" label="Payouts" />
        <SidebarLink to="/admin/deliveries" label="Deliveries" />
        <SidebarLink to="/admin/returns" label="Returns" />
        <SidebarLink to="/admin/ads" label="Seller Ads" />
        <SidebarLink to="/admin/affiliates" label="Affiliates" />
        <SidebarLink to="/admin/settings" label="Settings" />
        <SidebarLink to="/admin/audit" label="Audit Log" />
        <SidebarLink to="/admin/notifications" label="Notifications" />
      </nav>
    </div>
  );
}

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.link,
        backgroundColor: isActive ? "#2a2a40" : "transparent",
      })}
    >
      {label}
    </NavLink>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    padding: "20px",
    color: "#fff",
    height: "100%",
    backgroundColor: "#1e1e2f",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  link: {
    padding: "12px 15px",
    borderRadius: "6px",
    color: "#fff",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 500,
  },
};
