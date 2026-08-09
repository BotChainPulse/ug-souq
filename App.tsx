import { RouterProvider } from "react-router-dom";
import { adminRouter } from "./admin/admin.routes";

function App() {
  return <RouterProvider router={adminRouter} />;
}

export default App;
