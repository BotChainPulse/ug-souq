import { useState } from "react";

export default function Settings() {
  const [settings] = useState({
    appId: "ug-souq",
    adminKey: "—",
    flutterwaveStatus: "—",
    maintenanceMode: "Off",
  });

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Settings</h2>

      <div style={styles.card}>
        <SettingItem label="APP ID" value={settings.appId} />
        <SettingItem label="Admin Key" value={settings.adminKey} />
        <SettingItem label="Flutterwave Status" value={settings.flutterwaveStatus} />
        <SettingItem label="Maintenance Mode" value={settings.maintenanceMode} />
      </div>
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.item}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
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
  card: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    border: "1px solid #e5e5e5",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  label: {
    fontSize: "15px",
    color: "#555",
  },
  value: {
    fontSize: "15px",
    fontWeight: "600",
  },
};
