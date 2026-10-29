import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import { Button } from "../components/ui";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { login } = useAuth();
  const nav = useNavigate();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const problems: string[] = [];
  if (!username.trim()) problems.push("Enter a username.");
  else if (/\s/.test(username)) problems.push("Usernames can't contain spaces.");
  if (!password) problems.push("Enter a password.");
  if (!isLogin && password && password !== confirm) problems.push("Passwords don't match.");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (problems.length) return;
    setBusy(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
        nav("/", { replace: true });
      } else {
        await authApi.register(username.trim(), password);
        nav("/login", { replace: true, state: { notice: "Account created. Sign in to start chatting." } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand";

  return (
    <main className="grid min-h-full place-items-center p-4">
      <form onSubmit={submit} noValidate className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-ink"><MessageCircle size={18} /></span>
          <span className="text-lg font-bold tracking-tight">Relay</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{isLogin ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{isLogin ? "Pick up your conversations." : "Choose a username other people will message."}</p>

        {notice && isLogin && <p role="status" className="mb-4 rounded-xl bg-sunken px-3 py-2 text-sm">{notice}</p>}

        <label className="mb-1 block text-sm font-medium" htmlFor="u">Username</label>
        <input id="u" className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />

        <label className="mt-4 mb-1 block text-sm font-medium" htmlFor="p">Password</label>
        <div className="relative">
          <input id="p" className={`${field} pr-11`} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink">
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {!isLogin && (
          <>
            <label className="mt-4 mb-1 block text-sm font-medium" htmlFor="c">Confirm password</label>
            <input id="c" className={field} type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </>
        )}

        <div aria-live="polite" className="mt-4 min-h-5 text-sm text-danger">
          {error ?? (touched && problems[0])}
        </div>

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
        </Button>

        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? "New to Relay? " : "Already have an account? "}
          <Link to={isLogin ? "/register" : "/login"} className="font-semibold text-brand hover:underline">
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </form>
    </main>
  );
}
