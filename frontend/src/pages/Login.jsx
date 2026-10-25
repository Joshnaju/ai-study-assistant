import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { loginUser } from "../services/authService";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
      general: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Save JWT tokens
      localStorage.setItem("access", response.access);
      localStorage.setItem("refresh", response.refresh);

      // Save user details
      localStorage.setItem("user", JSON.stringify(response.user));

      // Continue to the study assistant page
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data;

      if (data?.email) {
        setErrors({ email: data.email[0] });
      } else if (data?.password) {
        setErrors({ password: data.password[0] });
      } else {
        setErrors({
          general:
            data?.non_field_errors?.[0] ||
            data?.detail ||
            "Invalid email or password.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue learning with your AI Study Assistant"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/register"
    >
      <form onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <div className="field-error mb-3" role="alert">
            {errors.general}
          </div>
        )}

        {/* Email */}
        <div className="mb-3">
          <label htmlFor="email" className="auth-label">
            Email Address
          </label>

          <input
            id="email"
            type="email"
            name="email"
            className={`form-control auth-input ${
              errors.email ? "is-invalid" : ""
            }`}
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          {errors.email && (
            <div className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="mb-3">
          <label htmlFor="password" className="auth-label">
            Password
          </label>

          <div className="position-relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              className={`form-control auth-input pe-5 ${
                errors.password ? "is-invalid" : ""
              }`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i
                className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
              ></i>
            </button>
          </div>

          {errors.password && (
            <div className="field-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
