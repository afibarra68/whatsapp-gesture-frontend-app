import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import type { MfaSetupResponse, MfaStatusResponse } from '../types';

export function AdminMfaCard() {
  const toast = useToast();
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await api<MfaStatusResponse>('/auth/mfa/status'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setSaving(true);
    try {
      setSetup(await api<MfaSetupResponse>('/auth/mfa/setup', { method: 'POST' }));
      setEnableCode('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmEnable = async (e: FormEvent) => {
    e.preventDefault();
    if (!setup) return;
    setSaving(true);
    try {
      await api('/auth/mfa/enable', {
        method: 'POST',
        body: { secret: setup.secret, code: enableCode.replace(/\s/g, '') },
      });
      toast.success('2FA activado');
      setSetup(null);
      setEnableCode('');
      loadStatus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDisable = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/mfa/disable', {
        method: 'POST',
        body: {
          password: disablePassword,
          code: disableCode.replace(/\s/g, ''),
        },
      });
      toast.success('2FA desactivado');
      setDisablePassword('');
      setDisableCode('');
      setSetup(null);
      loadStatus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted">Cargando seguridad 2FA…</p>
      </div>
    );
  }

  if (!status?.available) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Autenticación en dos pasos (admin)</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Protege cuentas administrador con un código de 6 dígitos desde una app autenticadora.
        Operadores y agentes no usan 2FA.
      </p>

      {status.enabled ? (
        <div>
          <p style={{ marginBottom: 12 }}>
            <span className="badge badge-green">2FA activo</span>
          </p>
          <form onSubmit={confirmDisable} className="grid-2" style={{ alignItems: 'end' }}>
            <div className="field">
              <label>Contraseña actual</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="field">
              <label>Código 2FA</label>
              <input
                type="text"
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                disabled={saving}
                className="mono"
              />
            </div>
            <div>
              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving ? 'Desactivando…' : 'Desactivar 2FA'}
              </button>
            </div>
          </form>
        </div>
      ) : setup ? (
        <form onSubmit={confirmEnable}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpauthUrl)}`}
              alt="QR para app autenticadora"
              width={180}
              height={180}
              style={{ borderRadius: 8, background: '#fff', padding: 8 }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p className="muted" style={{ marginBottom: 8 }}>
                1. Escanea el QR con tu app autenticadora.
              </p>
              <p className="muted" style={{ marginBottom: 8 }}>
                2. O ingresa manualmente este secreto:
              </p>
              <code className="mono" style={{ wordBreak: 'break-all', fontSize: 12 }}>
                {setup.secret}
              </code>
            </div>
          </div>
          <div className="field" style={{ maxWidth: 280 }}>
            <label>Código de verificación</label>
            <input
              type="text"
              inputMode="numeric"
              value={enableCode}
              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              disabled={saving}
              className="mono"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Activando…' : 'Activar 2FA'}
            </button>
            <button type="button" className="btn" onClick={() => setSetup(null)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-primary" onClick={startSetup} disabled={saving}>
          Configurar 2FA
        </button>
      )}
    </div>
  );
}
