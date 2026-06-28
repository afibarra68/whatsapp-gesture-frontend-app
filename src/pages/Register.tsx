import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { EVENT } from '../config';

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ ok: boolean; message: string }>('/auth/register', {
        method: 'POST',
        body: {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
        auth: false,
      });
      setSent(true);
      toast.success(res.message);
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">
            <span className="dot">{EVENT.short}</span> {EVENT.name}
          </div>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Solicitud enviada</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Tu cuenta quedó <strong>pendiente de aprobación</strong>. Un administrador debe
            aprobarla antes de que puedas iniciar sesión.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/login')}>
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="login-logo">
          <span className="dot">{EVENT.short}</span> {EVENT.name}
        </div>
        <p className="muted login-tagline">Crear cuenta — requiere aprobación del administrador</p>

        <div className="field">
          <label htmlFor="reg-nombre">Nombre completo</label>
          <input
            id="reg-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="reg-email">Correo</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="tu@correo.com"
          />
        </div>
        <div className="field">
          <label htmlFor="reg-password">Contraseña (mín. 8 caracteres)</label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="reg-confirm">Confirmar contraseña</label>
          <input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Enviando…' : 'Solicitar cuenta'}
        </button>
        <p className="muted" style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
