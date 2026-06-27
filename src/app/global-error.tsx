"use client";

import { useEffect } from "react";

// Last-resort boundary that replaces the root layout when the layout itself
// throws. LanguageProvider is NOT available here, so it falls back to English
// and must render its own <html>/<body>. Only runs in production.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          margin: 0,
          color: "#0c0c48",
          background: "#ffffff",
        }}
      >
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: 12 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 9999,
              border: 0,
              background: "#0c0c48",
              color: "#ffffff",
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
