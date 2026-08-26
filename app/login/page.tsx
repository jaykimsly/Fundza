'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const sendOtp = async () => {
    if (!email.includes('@')) {
      setMessage('Please enter a valid email');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setOtpSent(true);
      setMessage('Check your email for the login code!');
    }

    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      setMessage('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) {
      setMessage(error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <main className="container" style={{ maxWidth: '420px', paddingTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem' }}></div>
        <h1 style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>Fundza</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Your matric study companion</p>
      </div>

      <div className="card">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>G</span>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {!otpSent ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@gmail.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '1rem',
                marginBottom: '0.75rem',
              }}
            />
            <button onClick={sendOtp} disabled={loading} className="btn" style={{ width: '100%' }}>
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#059669', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Code sent to {email}
            </p>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
              Enter 6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '1.25rem',
                letterSpacing: '0.5em',
                textAlign: 'center',
                marginBottom: '0.75rem',
              }}
            />
            <button onClick={verifyOtp} disabled={loading} className="btn" style={{ width: '100%' }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Use different email
            </button>
          </div>
        )}

        {message && (
          <p style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: message.includes('sent') || message.includes('Code') ? '#ecfdf5' : '#fef2f2',
            color: message.includes('sent') || message.includes('Code') ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}>
            {message}
          </p>
        )}
      </div>

      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginTop: '1.5rem' }}>
        By logging in, you agree to Fundza's student data policy.
      </p>
    </main>
  );
}
