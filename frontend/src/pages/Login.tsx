import { useAuth } from '../AuthContext'

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg1)'
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border1)',
        borderRadius: 16, padding: '48px 40px', maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>
            Sales<span style={{ color: 'var(--green)' }}>Pilot</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>AI Sales Intelligence</div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Sign in to access your sales dashboard</div>
        </div>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%', padding: '12px 20px',
            background: '#fff', border: 'none', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#1a1a1a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.1s, box-shadow 0.1s'
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text3)' }}>
          Access is restricted to authorised team members only.
        </div>
      </div>
    </div>
  )
}
