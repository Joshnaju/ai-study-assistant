import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { registerUser } from "../services/authService";

function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSuccess("");
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrors({});
    setSuccess("");

    // Frontend validation
    const newErrors = {};

    if (formData.full_name.trim().length < 3) {
      newErrors.full_name = "Full name must contain at least 3 characters.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    }

    if (formData.password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters.";
    }

    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Call Django registration API
    try {
      setLoading(true);

      const response = await registerUser({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      setSuccess(response.message || "Registration successful!");

      setFormData({
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
      });

      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      const data = err.response?.data;

      if (data) {
        const fieldErrors = {};

        ["full_name", "email", "password", "confirm_password"].forEach(
          (field) => {
            if (data[field]) {
              fieldErrors[field] = Array.isArray(data[field])
                ? data[field][0]
                : data[field];
            }
          },
        );

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else if (data.non_field_errors) {
          setErrors({
            general: data.non_field_errors[0],
          });
        } else if (data.detail) {
          setErrors({
            general: data.detail,
          });
        } else {
          setErrors({
            general: "Unable to register. Please try again.",
          });
        }
      } else {
        setErrors({
          general: "Unable to connect to the server. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start learning with your AI Study Assistant"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Success message */}
        {success && (
          <div className="alert alert-success py-2" role="status">
            {success}
          </div>
        )}

        {/* Full Name */}
        <div className="mb-3">
          <label htmlFor="full_name" className="auth-label">
            Full Name
          </label>

          <input
            id="full_name"
            type="text"
            name="full_name"
            className={`form-control auth-input ${
              errors.full_name ? "is-invalid" : ""
            }`}
            placeholder="Enter your full name"
            value={formData.full_name}
            onChange={handleChange}
            autoComplete="name"
            required
          />

          {errors.full_name && (
            <div className="field-error" role="alert">
              {errors.full_name}
            </div>
          )}
        </div>

        {/* Email Address */}
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
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
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

        {/* Confirm Password */}
        <div className="mb-3">
          <label htmlFor="confirm_password" className="auth-label">
            Confirm Password
          </label>

          <div className="position-relative">
            <input
              id="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              name="confirm_password"
              className={`form-control auth-input pe-5 ${
                errors.confirm_password ? "is-invalid" : ""
              }`}
              placeholder="Re-enter your password"
              value={formData.confirm_password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              <i
                className={`bi ${
                  showConfirmPassword ? "bi-eye-slash" : "bi-eye"
                }`}
              ></i>
            </button>
          </div>

          {errors.confirm_password && (
            <div className="field-error" role="alert">
              {errors.confirm_password}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Register;
