import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function TrialScreen({ onTrialStart }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("LET");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data, error: insertError } = await supabase
        .from("trial_sessions")
        .insert([
          {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            course_id: course,
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            converted: false,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Store trial info locally
      localStorage.setItem(
        "trial_session",
        JSON.stringify({
          id: data.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          course_id: course,
          expires_at: expiresAt,
        })
      );

      onTrialStart({
        id: data.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
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
      <div className="trial-card">
        {/* Header */}
        <div className="trial-header">
          <div className="trial-badge">FREE · 1 HOUR</div>
          <h1 className="trial-title">Try Readwise free</h1>
          <p className="trial-subtitle">
            No payment required. Get a full hour to explore your study plan,
            readiness score, and review queue.
          </p>
        </div>

        {/* Form */}
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
              onChange={(e) => setEmail(e.target.value)}
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
                { id: "LET", label: "LET", sub: "Licensure Exam for Teachers" },
                { id: "NLE", label: "NLE", sub: "Coming soon", disabled: true },
                { id: "CPA", label: "CPA", sub: "Coming soon", disabled: true },
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

          {error && <p className="trial-error">{error}</p>}

          <button
            className="trial-start-btn"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? "Starting your trial…" : "Start free trial →"}
          </button>

          <p className="trial-fine-print">
            1 hour access · No card required · ₱249 to unlock full access
          </p>
        </div>
      </div>

      <style>{`
        .trial-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: var(--bg);
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
          color: var(--text);
          margin: 0 0 12px;
          line-height: 1.2;
        }

        .trial-subtitle {
          font-size: 15px;
          color: var(--text-muted);
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
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .trial-input {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 16px;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }

        .trial-input:focus {
          border-color: var(--accent);
        }

        .trial-input::placeholder {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .trial-field-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          opacity: 0.7;
        }

        .trial-course-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .trial-course-btn {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
        }

        .trial-course-btn.active {
          border-color: var(--accent);
          background: var(--accent-soft, rgba(99,102,241,0.08));
        }

        .trial-course-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .trial-course-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        .trial-course-sub {
          font-size: 10px;
          color: var(--text-muted);
          text-align: center;
        }

        .trial-error {
          font-size: 13px;
          color: #ef4444;
          margin: 0;
          padding: 10px 14px;
          background: rgba(239,68,68,0.08);
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.2);
        }

        .trial-start-btn {
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          width: 100%;
        }

        .trial-start-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .trial-start-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

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
