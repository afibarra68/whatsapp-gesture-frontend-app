import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { EVENT } from '../config';

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('admin@local.test');
  const [password, setPassword] = useState('Cambiar.Esto.123');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/', { replace: true });
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bienvenido');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <span className="dot">{EVENT.short}</span> {EVENT.name}
        </div>
        <p className="muted" style={{ marginTop: -12, marginBottom: 20, fontSize: 13 }}>
          {EVENT.tagline}
        </p>
        <div className="field">
          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          Usuario base por defecto precargado para pruebas.
        </p>
      </form>
    </div>
  );
}
