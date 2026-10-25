import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AppLayout.css";

const navigationItems = [
  { label: "Home", path: "/dashboard", icon: "bi-house-door-fill" },
  { label: "My Documents", path: "/documents", icon: "bi-file-earmark-text" },
  { label: "Chat", path: "/chat", icon: "bi-chat-dots" },
  { label: "Summarize", path: "/summary", icon: "bi-card-text" },
  { label: "MCQs", path: "/mcqs", icon: "bi-patch-question" },
  { label: "Chat History", path: "/chat-history", icon: "bi-clock-history" },
];

function AppLayout() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  const displayName = user.full_name || user.name || user.email || "Student";

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="study-app">
      {/* Left sidebar */}
      <aside className="study-sidebar">
        <div className="sidebar-brand">
          <i className="bi bi-mortarboard-fill" />
          <span>Student AI Assistant</span>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? "active" : ""}`
              }
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          {/* <i className="bi bi-plus-lg" /> */}
          <i className="bi bi-box-arrow-right" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Right side */}
      <div className="study-main">
        <header className="study-header">
          <div className="header-spacer" />

          <div className="profile-container">
            <button
              type="button"
              className="profile-button"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-avatar">
                <i className="bi bi-person-fill" />
              </span>

              <span className="profile-name">{displayName}</span>

              <i
                className={`bi bi-chevron-down profile-chevron ${
                  profileOpen ? "rotated" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-info">
                  <strong>{displayName}</strong>
                  <span>{user.email || "Student account"}</span>
                </div>

                <button type="button" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="study-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
