export default function PendingPage() {
  return (
    <div style={{ padding: 32, textAlign: "center", maxWidth: 400, margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h2>Application under review</h2>
      <p style={{ color: "#666", lineHeight: 1.6, marginTop: 8 }}>
        We're verifying your LinkedIn profile.<br />
        We'll email you within 24 hours once approved.<br /><br />
        You'll start with <strong>2 credits</strong> on approval.
      </p>
    </div>
  );
}
