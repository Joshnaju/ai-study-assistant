import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Chat from "./pages/Chat/Chat";
import Documents from "./pages/Documents/Documents";
import Summary from "./pages/Summary/Summary";
import MCQ from "./pages/MCQ/MCQ";
import Home from "./pages/Home/Home";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/mcqs" element={<MCQ />} />
          <Route
            path="/chat-history"
            element={<ComingSoon title="Chat History" />}
          />
        </Route>
      </Route>

      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="text-center py-5">
      <h2>{title}</h2>
      <p className="text-muted">This feature will be implemented next.</p>
    </div>
  );
}

export default App;
