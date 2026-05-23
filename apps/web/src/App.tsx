export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F2F2F7',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 48,
          fontWeight: 700,
          color: '#1E3A5F',
          lineHeight: 1,
        }}>
          Syndic<span style={{ color: '#F59E0B' }}>Sage</span>
        </h1>
        <p style={{ color: '#6E6E73', marginTop: 8, fontSize: 14 }}>
          Foundation ready. Building features next.
        </p>
      </div>
    </div>
  )
}
