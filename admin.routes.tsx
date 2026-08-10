import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const Overview = lazy(() => import("./Overview"));
const Sellers = lazy(() => import("./Sellers"));
const Listings = lazy(() => import("./Listings"));
const Orders = lazy(() => import("./Orders"));
const Payouts = lazy(() => import("./Payouts"));
const Deliveries = lazy(() => import("./Deliveries"));
const Returns = lazy(() => import("./Returns"));
const SellerAds = lazy(() => import("./SellerAds"));
const Affiliates = lazy(() => import("./Affiliates"));
const Settings = lazy(() => import("./Settings"));
const AuditLog = lazy(() => import("./AuditLog"));
const Notifications = lazy(() => import("./Notifications"));

export const adminRouter = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Overview /> },
      { path: "sellers", element: <Sellers /> },
      { path: "listings", element: <Listings /> },
      { path: "orders", element: <Orders /> },
      { path: "payouts", element: <Payouts /> },
      { path: "deliveries", element: <Deliveries /> },
      { path: "returns", element: <Returns /> },
      { path: "ads", element: <SellerAds /> },
      { path: "affiliates", element: <Affiliates /> },
      { path: "settings", element: <Settings /> },
      { path: "audit", element: <AuditLog /> },
      { path: "notifications", element: <Notifications /> },
    ],
  },
]);
