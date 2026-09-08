'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppIcon from '@/components/AppIcon';
import { FundzaButton, FundzaCard } from '@/components/Phase14Primitives';

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
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const sendOtp = async () => {
    if (!email.includes('@')) { setMessage('Please enter a valid email address.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) setMessage(error.message);
    else { setOtpSent(true); setMessage('Check your email for the login code.'); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setMessage('Enter the 6-digit code.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) setMessage(error.message);
    else router.push('/');
    setLoading(false);
  };

  const messageIsSuccess = message.includes('Check your email') || message.includes('sent');

  return (
    <main className="fd-shell-content fd-auth-page">
      <div className="fd-auth-container">
        <header className="fd-auth-header">
          <div className="fd-shell-logo" aria-hidden="true">F</div>
          <p className="fd-section-label">Fundza</p>
          <h1>Welcome back.</h1>
          <p>Sign in to continue your study journey.</p>
        </header>

        <FundzaCard className="fd-auth-card">
          <FundzaButton variant="secondary" className="fd-auth-google" onClick={handleGoogleLogin} disabled={loading}>
            <span aria-hidden="true" className="fd-auth-google-mark">G</span>
            Continue with Google
          </FundzaButton>

          <div className="fd-auth-divider"><span>or</span></div>

          {!otpSent ? (
            <form onSubmit={(event) => { event.preventDefault(); void sendOtp(); }} className="fd-auth-form">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="student@gmail.com" autoComplete="email" />
              <FundzaButton type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send login code'}</FundzaButton>
            </form>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void verifyOtp(); }} className="fd-auth-form">
              <div className="fd-auth-success">Code sent to <strong>{email}</strong></div>
              <label htmlFor="otp">6-digit login code</label>
              <input id="otp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="123456" autoComplete="one-time-code" className="fd-auth-otp" />
              <FundzaButton type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify & log in'}</FundzaButton>
              <button type="button" className="fd-auth-text-button" onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}>Use a different email</button>
            </form>
          )}

          {message && <div className={`fd-auth-message ${messageIsSuccess ? 'is-success' : 'is-error'}`} role="status">{message}</div>}
        </FundzaCard>

        <p className="fd-auth-legal">By logging in, you agree to Fundza&apos;s student data policy and applicable terms.</p>
        <p className="fd-auth-support"><AppIcon name="shield" size={14} /> Your account is protected by secure authentication.</p>
      </div>
    </main>
  );
}
