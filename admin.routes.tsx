import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const Overview = lazy(() => import("./pages/Overview"));
const Sellers = lazy(() => import("./pages/Sellers"));
const Listings = lazy(() => import("./pages/Listings"));
const Orders = lazy(() => import("./pages/Orders"));
const Payouts = lazy(() => import("./pages/Payouts"));
const Deliveries = lazy(() => import("./pages/Deliveries"));
const Returns = lazy(() => import("./pages/Returns"));
const SellerAds = lazy(() => import("./pages/SellerAds"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Notifications = lazy(() => import("./pages/Notifications"));

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
