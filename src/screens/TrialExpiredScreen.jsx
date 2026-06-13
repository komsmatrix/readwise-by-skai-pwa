export default function TrialExpiredScreen({ trialData, readinessScore }) {
  const name = trialData?.name?.split(" ")[0] || "there";

  return (
    <div className="expired-screen">
      <div className="expired-card">
        {/* Score recap */}
        <div className="expired-score-block">
          <div className="expired-score-ring">
            <span className="expired-score-number">
              {readinessScore ?? "—"}%
            </span>
            <span className="expired-score-label">Readiness</span>
          </div>
        </div>

        {/* Message */}
        <div className="expired-message">
          <h2 className="expired-title">Your free hour is up, {name}.</h2>
          <p className="expired-body">
            You reached a readiness score of{" "}
            <strong>{readinessScore ?? "—"}%</strong> in one session. Students
            who study consistently for 30 days average a score above 70%.
          </p>
          <p className="expired-body">
            Full access gives you unlimited sessions, spaced repetition, and a
            daily study plan until exam day.
          </p>
        </div>

        {/* CTA */}
        <div className="expired-cta-block">
          <a href="/buy" className="expired-buy-btn">
            Unlock full access · ₱249
          </a>
          <p className="expired-price-note">
            One-time payment · LET exam · Lifetime access
          </p>
        </div>

        {/* Reminder option */}
        <div className="expired-reminder">
          <p className="expired-reminder-text">Not ready to buy yet?</p>
          <a
            href={`mailto:?subject=Readwise reminder&body=Ready to continue studying for the LET? Get full access at readwisebyskai.com/buy`}
            className="expired-reminder-link"
          >
            Send yourself a reminder →
          </a>
        </div>
      </div>

      <style>{`
        .expired-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: var(--bg);
        }

        .expired-card {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          text-align: center;
        }

        .expired-score-block {
          display: flex;
          justify-content: center;
        }

        .expired-score-ring {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 3px solid var(--accent);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .expired-score-number {
          font-size: 32px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
        }

        .expired-score-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .expired-message {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .expired-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1.3;
        }

        .expired-body {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.6;
        }

        .expired-body strong {
          color: var(--text);
        }

        .expired-cta-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .expired-buy-btn {
          display: block;
          width: 100%;
          background: var(--accent);
          color: white;
          text-decoration: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          transition: opacity 0.15s, transform 0.1s;
          box-sizing: border-box;
        }

        .expired-buy-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .expired-price-note {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          opacity: 0.6;
        }

        .expired-reminder {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
          width: 100%;
        }

        .expired-reminder-text {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }

        .expired-reminder-link {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
        }

        .expired-reminder-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
