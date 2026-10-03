'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Coffee, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'تعذر تسجيل الدخول');
      window.location.replace('/admin');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر الاتصال بالخادم، حاول مجدداً');
      setBusy(false);
    }
  }

  return (
    <main className="login-shell" dir="rtl">
      <div className="login-topline"><a href="/" className="brand-mark"><Coffee size={19} /> أصلي</a><span>مساحة إدارة المتجر</span></div>
      <section className="login-panel">
        <div className="login-emblem"><Coffee size={26} strokeWidth={1.7} /></div>
        <p className="eyebrow">ASLY COFFEE · MANAGEMENT</p>
        <h1>مرحباً بعودتك</h1>
        <p className="login-copy">سجّل الدخول لمتابعة طلبات أصلي وإدارة تفاصيلها.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">اسم المستخدم</label>
          <div className="input-wrap"><UserRound size={18} /><input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div>
          <label htmlFor="password">كلمة المرور</label>
          <div className="input-wrap"><LockKeyhole size={18} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="reveal-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" type="submit" disabled={busy}>{busy ? 'جارٍ التحقق...' : <>دخول إلى لوحة الإدارة <ArrowLeft size={17} /></>}</button>
        </form>
      </section>
      <p className="login-footnote">أصلي للقهوة المختصة <span>·</span> صنع بعناية</p>
    </main>
  );
}