'use client';

export default function GlobalError({ error, reset }) {
  const digest = error?.digest;

  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            fontFamily: 'Arial, sans-serif',
            background: '#f8fafc',
            color: '#0f172a',
          }}
        >
          <section
            style={{
              width: '100%',
              maxWidth: '560px',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              background: '#fffbeb',
              padding: '28px',
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            }}
          >
            <p style={{ margin: 0, color: '#92400e', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              Temporary service issue
            </p>
            <h1 style={{ margin: '12px 0 0', fontSize: '26px', lineHeight: 1.2 }}>
              The database is temporarily unavailable.
            </h1>
            <p style={{ margin: '14px 0 0', color: '#475569', fontSize: '15px', lineHeight: 1.6 }}>
              AlgoStories is deployed, but the database provider is currently refusing connections. Please try again after the database quota or connection issue is resolved.
            </p>
            {digest ? (
              <p style={{ margin: '14px 0 0', color: '#64748b', fontSize: '12px' }}>Error digest: {digest}</p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '44px',
                marginTop: '22px',
                border: 0,
                borderRadius: '6px',
                background: '#0f172a',
                color: '#fff',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
