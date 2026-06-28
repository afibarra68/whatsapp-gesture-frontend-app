import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EVENT } from '../config';

type Step = 'credentials' | 'mfa';

export function Login() {
  const { login, verifyMfa, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaUserName, setMfaUserName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const submitCredentials = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error('Ingresa correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const res = await login(normalizedEmail, password);
      if ('requiresMfa' in res && res.requiresMfa) {
        setMfaToken(res.mfaToken);
        setMfaUserName(res.user.nombre);
        setCode('');
        setStep('mfa');
        toast.success('Contraseña correcta. Ingresa el código 2FA.');
        return;
      }
      toast.success('Bienvenido');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const submitMfa = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length < 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      await verifyMfa(mfaToken, trimmed);
      toast.success('Bienvenido');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Código 2FA incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setMfaToken('');
    setCode('');
    setPassword('');
  };

  if (authLoading) {
    return <div className="center-screen">Cargando…</div>;
  }

  return (
    <div className="login-screen">
      <form
        className="login-card"
        onSubmit={step === 'mfa' ? submitMfa : submitCredentials}
        noValidate
      >
        <div className="login-logo">
          <span className="dot">{EVENT.short}</span> {EVENT.name}
        </div>
        <p className="muted login-tagline">
          {step === 'mfa' ? `Verificación en dos pasos · ${mfaUserName}` : EVENT.tagline}
        </p>

        {step === 'credentials' ? (
          <>
            <div className="field">
              <label htmlFor="login-email">Correo</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                disabled={loading}
                placeholder="tu@correo.com"
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
            <p className="muted" style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
              ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
            </p>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="login-mfa">Código de autenticador</label>
              <input
                id="login-mfa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                required
                disabled={loading}
                className="mono"
                style={{ letterSpacing: '0.25em', fontSize: '1.25rem', textAlign: 'center' }}
              />
              <small className="muted">
                Abre Google Authenticator, Microsoft Authenticator o Authy.
              </small>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Verificando…' : 'Confirmar código'}
            </button>
            <button
              type="button"
              className="btn btn-block"
              style={{ marginTop: 8 }}
              onClick={backToCredentials}
              disabled={loading}
            >
              Volver
            </button>
          </>
        )}
      </form>
    </div>
  );
}
