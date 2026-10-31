import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/Button";
import { Icon } from "../components/icons";
import { PasswordInput } from "../components/PasswordInput";
import { readApiError } from "../utils/errors";

const EMPTY_FORM = { username: "", email: "", password: "" };

const DEMO_ACCOUNTS = [
  { username: "demo", label: "Member", hint: "Book rooms, report issues" },
  { username: "manager", label: "Manager", hint: "Also approves requests" },
];
const DEMO_PASSWORD = "VaultDesk@123"; // local demo data only (see seed_demo)

const WRONG_LOGIN = "Wrong username or password. Check Caps Lock and try again.";

export default function AuthPage() {
  const { status, login, register } = useAuthStore(
    useShallow((state) => ({ status: state.status, login: state.login, register: state.register })),
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from ?? "/";
  if (status === "authenticated") return <Navigate to={redirectTo} replace />;

  const isLogin = mode === "login";
  const { general, fields } = readApiError(error, { unauthorized: WRONG_LOGIN });
  const canSubmit = form.username.trim() && form.password && (isLogin || form.email.trim());

  // One change handler for every input, using the input's name attribute.
  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  async function signIn(username, password) {
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isLogin) return signIn(form.username, form.password);

    setSubmitting(true);
    setError(null);
    try {
      await register({ ...form, username: form.username.trim(), email: form.email.trim() });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <form className="panel auth__card" onSubmit={handleSubmit} noValidate>
        <span className="auth__logo">
          <Icon name="logo" size={30} strokeWidth={2.2} />
        </span>
        <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">Book rooms, report issues and manage your workspace.</p>

        <div className="segmented" role="tablist" aria-label="Log in or sign up">
          <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? "is-active" : ""} onClick={() => switchMode("login")}>
            Log in
          </button>
          <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? "is-active" : ""} onClick={() => switchMode("register")}>
            Sign up
          </button>
        </div>

        <label className="field">
          {isLogin ? "Username or email" : "Username"}
          <span className="input-with-icon">
            <Icon name="user" size={18} className="input-with-icon__lead" />
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
              placeholder={isLogin ? "e.g. demo" : "Pick a username"}
              aria-invalid={Boolean(fields.username)}
            />
          </span>
          {fields.username && <span className="field__hint field__hint--error">{fields.username}</span>}
        </label>

        {!isLogin && (
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={Boolean(fields.email)}
            />
            {fields.email && <span className="field__hint field__hint--error">{fields.email}</span>}
          </label>
        )}

        <PasswordInput
          name="password"
          value={form.password}
          onChange={handleChange}
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "Your password" : "At least 8 characters"}
          aria-invalid={Boolean(fields.password)}
        />
        {fields.password && <span className="field__hint field__hint--error">{fields.password}</span>}
        {!isLogin && !fields.password && (
          <span className="field__hint">At least 8 characters, not too common, not similar to your username.</span>
        )}

        {general && (
          <p className="status status--error" role="alert">
            {general}
          </p>
        )}

        <Button type="submit" loading={submitting} disabled={!canSubmit}>
          {isLogin ? "Log in" : "Create account"}
        </Button>

        {isLogin && (
          <div className="demo-logins">
            <span className="demo-logins__title">Just exploring? Use a demo account</span>
            <div className="demo-logins__buttons">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="demo-login"
                  disabled={submitting}
                  onClick={() => signIn(account.username, DEMO_PASSWORD)}
                >
                  <strong>{account.label}</strong>
                  <span>{account.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
