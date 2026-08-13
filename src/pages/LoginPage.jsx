import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { setEmployeeAuth } from "../store/authSlice";
import { useEmployeeLoginMutation } from "../store/employeeApi";

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useSelector((state) => state.auth.token);
  const [employeeLogin, { isLoading }] = useEmployeeLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    login: "",
    password: "",
  });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const result = await employeeLogin({
        login: form.login,
        password: form.password,
      }).unwrap();

      dispatch(setEmployeeAuth(result.innerData));
      const fromPath = location.state?.from;
      navigate(fromPath || "/", { replace: true });
    } catch (err) {
      setError(err?.data?.message || "Login xato");
    }
  };

  if (token) return <Navigate to="/" replace />;

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
            <path
              d="M5 21V8L12 4L19 8V21"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M9 21V15H15V21" stroke="currentColor" strokeWidth="2" />
            <path d="M8 10H9" stroke="currentColor" strokeWidth="2" />
            <path d="M15 10H16" stroke="currentColor" strokeWidth="2" />
            <path d="M8 13H9" stroke="currentColor" strokeWidth="2" />
            <path d="M15 13H16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className="login-head">
          <h1>Tizimga kirish</h1>
        </div>

        <div className="input-group">
          <div className="input-with-icon">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                <circle
                  cx="12"
                  cy="8"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M5 19C5 15.7 7.9 13 11.5 13H12.5C16.1 13 19 15.7 19 19"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              placeholder="Login"
              value={form.login}
              onChange={(e) =>
                setForm((p) => ({ ...p, login: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="input-group">
          <div className="password-wrap">
            <span className="field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 10V8.5C8 6.6 9.6 5 11.5 5H12.5C14.4 5 16 6.6 16 8.5V10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              placeholder="Parol"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"
              }
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M4 4L20 20" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M10.6 10.7C10.2 11.1 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 12.9 13.8 13.3 13.4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M17.9 17.9C16.3 19 14.3 19.7 12 19.7C7.5 19.7 4.1 16.8 2.5 12C3.3 9.8 4.6 8.1 6.3 6.9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M9.2 5.3C10.1 5.1 11 5 12 5C16.5 5 19.9 7.9 21.5 12C21 13.4 20.2 14.6 19.2 15.6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M2.5 12C4.1 7.2 7.5 4.3 12 4.3C16.5 4.3 19.9 7.2 21.5 12C19.9 16.8 16.5 19.7 12 19.7C7.5 19.7 4.1 16.8 2.5 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-btn login-btn" disabled={isLoading}>
          {isLoading ? "Kutilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
