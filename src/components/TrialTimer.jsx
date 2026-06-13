import { useState, useEffect } from "react";

export default function TrialTimer({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
      setShowWarning(diff > 0 && diff <= 600); // 10 min warning
      if (diff === 0) onExpire?.();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className={`trial-timer ${showWarning ? "warning" : ""}`}>
      <span className="trial-timer-icon">{showWarning ? "⚠️" : "⏱"}</span>
      <span className="trial-timer-text">
        {showWarning
          ? `Trial ends in ${formatted}`
          : `Free trial · ${formatted} left`}
      </span>
      {showWarning && (
        <a href="/buy" className="trial-timer-cta">
          Unlock ₱249 →
        </a>
      )}

      <style>{`
        .trial-timer {
          position: fixed;
          bottom: 72px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 6px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
          z-index: 100;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s;
        }

        .trial-timer.warning {
          border-color: #f59e0b;
          background: rgba(245,158,11,0.08);
          color: #f59e0b;
        }

        .trial-timer-icon {
          font-size: 13px;
        }

        .trial-timer-text {
          font-weight: 500;
        }

        .trial-timer-cta {
          font-weight: 700;
          color: var(--accent);
          text-decoration: none;
          border-left: 1px solid var(--border);
          padding-left: 10px;
          margin-left: 2px;
        }

        .trial-timer-cta:hover {
          text-decoration: underline;
        }

        @media (max-width: 400px) {
          .trial-timer {
            bottom: 76px;
            font-size: 11px;
            padding: 5px 12px;
          }
        }
      `}</style>
    </div>
  );
}
