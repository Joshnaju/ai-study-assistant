import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    const token = localStorage.getItem("access");

    if (token) {
      navigate("/home");
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div className="text-center">
        <div className="mb-3">
          {/* <img
            src="/hospital.png"
            alt="AI Assistant Logo"
            width="80"
            height="80"
          /> */}
          <i
            className="bi bi-mortarboard-fill d-inline-block text-primary-emphasis"
            style={{
              fontSize: "80px",
              lineHeight: 1.2,
            }}
          ></i>
        </div>

        <h1 className="display-1 fw-bold text-primary-emphasis">404</h1>

        <h2 className="fw-bold text-primary-emphasis">Page Not Found</h2>

        <p className="text-muted mb-4">
          Sorry, the page you are looking for does not exist.
        </p>

        <button
          className="btn px-4"
          style={{
            backgroundColor: "var(--bs-primary-text-emphasis)",
            borderColor: "var(--bs-primary-text-emphasis)",
            color: "white",
          }}
          onClick={handleGoHome}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

export default NotFound;
