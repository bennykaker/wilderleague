import Link from "next/link";

export default function HomePage() {
  const links = [
    {
      href: "/matrix",
      title: "Matrix Recast Demo",
      description: "Drag actors into Neo, Trinity, and Morpheus.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #020617 0%, #0f172a 45%, #111827 100%)",
        color: "#f8fafc",
        padding: "40px 24px 64px",
      }}
    >
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "24px",
            padding: "32px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#93c5fd",
              marginBottom: "12px",
            }}
          >
            Wilderleague
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "48px",
              lineHeight: 1.05,
              fontWeight: 900,
              marginBottom: "14px",
            }}
          >
            Recast movies like a deranged studio executive.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.6,
              color: "#cbd5e1",
            }}
          >
            Wilderleague is a casting sandbox. Pick a movie, drag actors into
            iconic roles, and build your cursed or inspired reboot.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "20px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "8px",
                }}
              >
                {link.title}
              </div>

              <div
                style={{
                  fontSize: "15px",
                  lineHeight: 1.5,
                  color: "#cbd5e1",
                  marginBottom: "16px",
                }}
              >
                {link.description}
              </div>

              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#93c5fd",
                }}
              >
                Open demo →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}