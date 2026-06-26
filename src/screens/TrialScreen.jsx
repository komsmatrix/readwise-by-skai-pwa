import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function TrialScreen({ onTrialStart, onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("LET");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(""); // "paid" | "trial" | ""

  const COURSE_PRICE = { LET: 249, TESDA: 99 }
  const activePrice = COURSE_PRICE[course] || 249

  const handleStart = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setErrorType("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check 1 — already a paid customer?
      const { data: customer } = await supabase
        .from("customers")
        .select("id, is_active")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (customer && customer.is_active) {
        setError("You already have full access with this email.");
        setErrorType("paid");
        setLoading(false);
        return;
      }

      // Check 2 — already used a trial?
      const { data: existing } = await supabase
        .from("trial_sessions")
        .select("id, converted")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existing) {
        if (existing.converted) {
          setError("You already have full access with this email.");
          setErrorType("paid");
        } else {
          setError("You've already used your free trial with this email.");
          setErrorType("trial");
        }
        setLoading(false);
        return;
      }

      // All clear — create trial
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data, error: insertError } = await supabase
        .from("trial_sessions")
        .insert([
          {
            name: name.trim(),
            email: cleanEmail,
            course_id: course,
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            converted: false,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      localStorage.setItem(
        "trial_session",
        JSON.stringify({
          id: data.id,
          name: name.trim(),
          email: cleanEmail,
          course_id: course,
          expires_at: expiresAt,
        })
      );

      onTrialStart({
        id: data.id,
        name: name.trim(),
        email: cleanEmail,
        course_id: course,
        expires_at: expiresAt,
        is_trial: true,
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trial-screen">
      <button onClick={() => onBack ? onBack() : window.history.back()} style={{ position:'absolute', top:20, left:20, display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer', padding:8, fontFamily:'inherit' }}>
        ← Back
      </button>
      <div className="trial-card">
        <div className="trial-header">
          <div className="trial-badge">FREE · 1 HOUR</div>
          <h1 className="trial-title">Try Readwise free</h1>
          <p className="trial-subtitle">
            No payment required. Get a full hour to explore your study plan,
            readiness score, and review queue.
          </p>
        </div>

        <div className="trial-form">
          <div className="trial-field">
            <label className="trial-label">Your name</label>
            <input
              className="trial-input"
              type="text"
              placeholder="Juan dela Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              autoFocus
            />
          </div>

          <div className="trial-field">
            <label className="trial-label">Email address</label>
            <input
              className="trial-input"
              type="email"
              placeholder="juan@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setErrorType("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
            <p className="trial-field-hint">
              We'll send you a reminder before your trial ends.
            </p>
          </div>

          <div className="trial-field">
            <label className="trial-label">Exam</label>
            <div className="trial-course-grid">
              {[
                { id: "LET",      label: "LET",      sub: "Licensure Exam for Teachers",  disabled: false },
                { id: "TESDA",    label: "TESDA",     sub: "NC Qualifications Bundle",     disabled: true  },
                { id: "NLE",      label: "NLE",       sub: "Coming soon",                  disabled: true  },
                { id: "NAPOLCOM", label: "NAPOLCOM",  sub: "Coming soon",                  disabled: true  },
              ].map((c) => (
                <button
                  key={c.id}
                  className={`trial-course-btn ${course === c.id ? "active" : ""} ${c.disabled ? "disabled" : ""}`}
                  onClick={() => !c.disabled && setCourse(c.id)}
                  disabled={c.disabled}
                >
                  <span className="trial-course-name">{c.label}</span>
                  <span className="trial-course-sub">{c.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {course === 'TESDA' && (
            <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:10, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#3b82f6' }}>🏅 TESDA Free Trial — Coming Soon</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                The free trial is currently available for <strong style={{ color:'var(--text-primary)' }}>LET only</strong>. TESDA reviewer access requires a one-time purchase of ₱99.
              </div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
                Want to see what's inside? Watch our sneak peek on YouTube before you buy.
              </div>
              <a href="https://www.youtube.com/@readwisebyskai" target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#FF0000', color:'white', borderRadius:8, padding:'10px 16px', fontWeight:700, fontSize:13, textDecoration:'none' }}>
                ▶ Watch Sneak Peek on YouTube
              </a>
              <a href="/buy?course=TESDA"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(59,130,246,0.15)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)', borderRadius:8, padding:'10px 16px', fontWeight:700, fontSize:13, textDecoration:'none' }}>
                Get TESDA Access · ₱99 →
              </a>
            </div>
          )}

          {error && (
            <div className="trial-error-block">
              <p className="trial-error">{error}</p>
              {errorType === "paid" && (
                <a href="/" className="trial-action-link">
                  Sign in to your account →
                </a>
              )}
              {errorType === "trial" && (
                <a href={`/buy?course=${course}`} className="trial-action-link">
                  Get full access · ₱{activePrice} →
                </a>
              )}
            </div>
          )}

          {course !== 'TESDA' && (
            <>
              <button
                className="trial-start-btn"
                onClick={handleStart}
                disabled={loading}
              >
                {loading ? "Checking…" : "Start free trial →"}
              </button>

              <p className="trial-fine-print">
                1 hour access · No card required · ₱{activePrice} to unlock full access
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        .trial-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: var(--bg-base);
          position: relative;
        }
        .trial-card {
          width: 100%;
          max-width: 420px;
        }
        .trial-header {
          margin-bottom: 32px;
          text-align: center;
        }
        .trial-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid var(--accent);
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .trial-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .trial-subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
        .trial-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .trial-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .trial-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .trial-input {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 16px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
        .trial-input:focus { border-color: var(--accent); }
        .trial-input::placeholder { color: var(--text-muted); opacity: 0.5; }
        .trial-field-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          opacity: 0.7;
        }
        .trial-course-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .trial-course-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
          font-family: inherit;
        }
        .trial-course-btn.active {
          border-color: var(--accent);
          background: var(--accent-dim);
        }
        .trial-course-btn.disabled { opacity: 0.4; cursor: not-allowed; }
        .trial-course-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .trial-course-sub { font-size: 10px; color: var(--text-muted); text-align: center; }
        .trial-error-block { display: flex; flex-direction: column; gap: 8px; }
        .trial-error {
          font-size: 13px;
          color: #ef4444;
          margin: 0;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.2);
        }
        .trial-action-link {
          display: block;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          text-decoration: none;
          padding: 10px;
          border: 1px solid var(--accent);
          border-radius: 8px;
          background: var(--accent-dim);
          transition: opacity 0.15s;
        }
        .trial-action-link:hover { opacity: 0.85; }
        .trial-start-btn {
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          width: 100%;
          font-family: inherit;
        }
        .trial-start-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .trial-start-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .trial-fine-print {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          margin: 0;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
