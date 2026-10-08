"use client";

// Last-resort boundary: replaces the whole document if the root layout itself fails. Plain HTML and inline styles
// only, because nothing else (providers, CSS, fonts) can be trusted at this point.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Georgia, serif", background: "#fff", color: "#222" }}>
        <div role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontWeight: 400, fontSize: 28, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ fontFamily: "Arial, sans-serif", fontSize: 14, color: "#555", maxWidth: 420, margin: "0 0 20px" }}>
            Sorry, Raveena Sarees could not load. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#7A1F2B", color: "#fff", border: 0, borderRadius: 999, padding: "13px 28px", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", minHeight: 44 }}
          >
            Try again
          </button>
          {error.digest && <p style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999", marginTop: 20 }}>Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
