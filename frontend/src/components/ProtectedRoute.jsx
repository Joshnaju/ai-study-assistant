import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute() {
  const accessToken = localStorage.getItem("access");
  const location = useLocation();

  // If the user is not logged in, redirect to Login
  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If the token exists, render the protected page
  return <Outlet />;
}

export default ProtectedRoute;
