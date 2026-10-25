import { Link } from "react-router-dom";

function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="bi bi-mortarboard-fill"></i>
        </div>

        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {children}

        <p className="auth-footer">
          {footerText}{" "}
          <Link className="auth-link" to={footerLinkTo}>
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
