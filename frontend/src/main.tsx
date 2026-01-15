import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import AppPage from "./pages/AppPage.tsx";
import { apiGet } from "./api";


function PrivateRoute({ children }: { children: JSX.Element }) {
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    apiGet("/auth/me")
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);

  if (ok === null) return <div style={{ padding: 16 }}>Checking auth…</div>;
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <AppPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
