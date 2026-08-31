import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "DogCareGH — Investor Deck",
  description: "DogCareGH — Ghana's first managed pet care platform.",
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return (
    <div className="pitch-root">
      {/* Top bar */}
      <header className="pitch-header">
        <div className="pitch-brand">
          <Image
            src="/icons/icon-192.png"
            alt="DogCareGH"
            width={32}
            height={32}
            className="pitch-logo"
          />
          <span className="pitch-wordmark">DogCareGH</span>
        </div>
        <a
          href="/pitch-deck.pdf"
          download="DogCareGH-Pitch-Deck-Aug2026.pdf"
          className="pitch-download"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </a>
      </header>

      {/* PDF viewer */}
      <main className="pitch-viewer">
        <iframe
          src="/pitch-deck.pdf#toolbar=0&navpanes=0&scrollbar=1&view=FitH"
          className="pitch-iframe"
          title="DogCareGH Investor Deck"
        />
      </main>

      <style>{`
        :root {
          --pitch-bg:      #06100f;
          --pitch-surface: #0d1f1c;
          --pitch-border:  rgba(0,176,150,0.15);
          --pitch-teal:    #00b096;
          --pitch-text:    #c8d8d6;
          --pitch-muted:   rgba(200,216,214,0.45);
          --header-h:      56px;
        }

        body {
          background: var(--pitch-bg) !important;
          margin: 0;
        }

        .pitch-root {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          background: var(--pitch-bg);
          font-family: var(--font-geist-sans, system-ui, sans-serif);
        }

        /* ── Header ── */
        .pitch-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-h);
          padding: 0 24px;
          background: var(--pitch-surface);
          border-bottom: 1px solid var(--pitch-border);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
          z-index: 10;
        }

        .pitch-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pitch-logo {
          border-radius: 8px;
        }

        .pitch-wordmark {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--pitch-text);
        }

        /* ── Download button ── */
        .pitch-download {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 16px;
          border-radius: 20px;
          border: 1px solid var(--pitch-border);
          background: rgba(0,176,150,0.08);
          color: var(--pitch-teal);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: background 0.18s, border-color 0.18s;
        }
        .pitch-download:hover {
          background: rgba(0,176,150,0.16);
          border-color: rgba(0,176,150,0.35);
        }

        /* ── PDF viewer ── */
        .pitch-viewer {
          flex: 1;
          display: flex;
          align-items: stretch;
          padding: 28px 32px 32px;
          background:
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(0,176,150,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 80% 20%, rgba(10,46,48,0.6) 0%, transparent 70%),
            var(--pitch-bg);
          min-height: 0;
        }

        .pitch-iframe {
          flex: 1;
          width: 100%;
          height: 100%;
          border: 1px solid var(--pitch-border);
          border-radius: 12px;
          background: #fff;
          box-shadow:
            0 0 0 1px rgba(0,176,150,0.08),
            0 32px 80px rgba(0,0,0,0.6),
            0 8px 24px rgba(0,0,0,0.4);
        }

        @media (max-width: 600px) {
          .pitch-viewer {
            padding: 16px 12px 20px;
          }
          .pitch-header {
            padding: 0 16px;
          }
          .pitch-wordmark {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
