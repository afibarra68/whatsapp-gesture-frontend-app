import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import type { Campaign, CampaignReport, CampaignSettings, MessageLog, Paginated } from '../types';

const LOGS_LIMIT_DEFAULT = 100;
const LOGS_LIMIT_OPTIONS = [50, 100, 200, 500];

interface Preview {
  total_destinatarios: number;
  banner?: string | null;
  ejemplo?: { texto: string } | null;
}

export function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.rol === 'admin';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [logsData, setLogsData] = useState<Paginated<MessageLog> | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit, setLogsLimit] = useState(LOGS_LIMIT_DEFAULT);
  const [logsLoading, setLogsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    try {
      const [camp, reportRes] = await Promise.all([
        api<Campaign>(`/campaigns/${id}`),
        api<CampaignReport>(`/campaigns/${id}/report`),
      ]);
      setCampaign(camp);
      setReport(reportRes);
      if (camp.estado === 'borrador') {
        api<Preview>(`/campaigns/${id}/preview`).then(setPreview).catch(() => {});
      }
      if (isAdmin) {
        api<CampaignSettings>('/campaigns/settings').then(setSettings).catch(() => {});
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [id, isAdmin, toast]);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(logsPage),
        limit: String(logsLimit),
      });
      const res = await api<Paginated<MessageLog>>(`/campaigns/${id}/logs?${qs.toString()}`);
      const pages = Math.max(1, Math.ceil(res.total / res.limit));
      if (logsPage > pages) {
        setLogsPage(pages);
        return;
      }
      setLogsData(res);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLogsLoading(false);
    }
  }, [id, logsPage, logsLimit, toast]);

  const refresh = useCallback(async () => {
    await Promise.all([loadCampaign(), loadLogs()]);
  }, [loadCampaign, loadLogs]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    setLogsPage(1);
  }, [id]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (campaign?.estado !== 'en_progreso') return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [campaign?.estado, refresh]);

  const action = async (verb: 'launch' | 'pause' | 'resume') => {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/campaigns/${id}/${verb}`, { method: 'POST' });
      toast.success(`Acción "${verb}" ejecutada`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const releaseBatch = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await api<{ procesados: number; pendientes: number }>(`/campaigns/${id}/release`, {
        method: 'POST',
        body: {},
      });
      toast.success(`Liberados ${res.procesados} mensajes · ${res.pendientes} pendientes`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const testSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !testPhone.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ message_id: string; message_status: string | null }>(
        `/campaigns/${id}/test-send`,
        { method: 'POST', body: { telefono: testPhone.trim() } },
      );
      toast.success(`Prueba enviada · ID: ${res.message_id || '—'}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    try {
      const updated = await api<CampaignSettings>('/campaigns/settings', {
        method: 'PATCH',
        body: settings,
      });
      setSettings(updated);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!campaign) return <div className="empty">Cargando campaña…</div>;

  const m = campaign.metricas;
  const pct = (n: number) => (m.total > 0 ? Math.round((n / m.total) * 100) : 0);
  const pendientes = report?.pendientes ?? 0;
  const retenidos = report?.retenidos_meta ?? 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/campaigns" className="muted" style={{ fontSize: 13 }}>
            ← Campañas
          </Link>
          <h1 style={{ marginTop: 6 }}>{campaign.nombre_campana}</h1>
          <p>
            Estado: <Badge value={campaign.estado} />
            {pendientes > 0 && (
              <span className="muted" style={{ marginLeft: 10 }}>
                · {pendientes} encolados
              </span>
            )}
            {retenidos > 0 && (
              <span className="muted" style={{ marginLeft: 10 }}>
                · {retenidos} retenidos por Meta
              </span>
            )}
          </p>
        </div>
        <div className="row">
          {campaign.estado === 'borrador' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => action('launch')}>
              ➤ Lanzar campaña
            </button>
          )}
          {campaign.estado === 'en_progreso' && (
            <>
              <button className="btn" disabled={busy} onClick={() => action('pause')}>
                ⏸ Pausar
              </button>
              {pendientes > 0 && (
                <button className="btn btn-primary" disabled={busy} onClick={releaseBatch}>
                  ⚡ Liberar lote ({settings?.release_batch_size ?? 20})
                </button>
              )}
            </>
          )}
          {campaign.estado === 'pausada' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => action('resume')}>
              ▶ Reanudar
            </button>
          )}
        </div>
      </div>

      {isAdmin && settings && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Configuración de envío</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Controla la velocidad y el tamaño de los lotes manuales. Solo administradores.
          </p>
          <form onSubmit={saveSettings} className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Mensajes por segundo</label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.send_rate_per_second}
                onChange={(e) =>
                  setSettings({ ...settings, send_rate_per_second: Number(e.target.value) })
                }
              />
            </div>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Tamaño de lote manual</label>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.release_batch_size}
                onChange={(e) =>
                  setSettings({ ...settings, release_batch_size: Number(e.target.value) })
                }
              />
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label>Política Meta (marketing)</label>
              <select
                value={settings.product_policy ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    product_policy: (e.target.value || null) as CampaignSettings['product_policy'],
                  })
                }
              >
                <option value="">Por defecto (.env)</option>
                <option value="CLOUD_API_FALLBACK">CLOUD_API_FALLBACK</option>
                <option value="STRICT">STRICT</option>
              </select>
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label>Compartir actividad</label>
              <select
                value={
                  settings.message_activity_sharing === null
                    ? ''
                    : settings.message_activity_sharing
                      ? 'true'
                      : 'false'
                }
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    message_activity_sharing:
                      e.target.value === '' ? null : e.target.value === 'true',
                  })
                }
              >
                <option value="">Por defecto (.env)</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" disabled={busy}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Probar envío</h3>
        <p className="muted" style={{ marginBottom: 10 }}>
          Envía un mensaje de prueba con la plantilla y variables de esta campaña.
        </p>
        <form onSubmit={testSend} className="row">
          <input
            style={{ flex: 1, maxWidth: 280 }}
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="573001234567"
            required
          />
          <button className="btn" disabled={busy}>
            Enviar prueba
          </button>
        </form>
      </div>

      {campaign.estado === 'borrador' && preview && (
        <div className="card">
          <h3>Vista previa</h3>
          <p>
            Destinatarios estimados: <b>{preview.total_destinatarios}</b>
          </p>
          {preview.banner && (
            <img
              src={preview.banner}
              alt="Banner del evento"
              style={{
                maxWidth: 360,
                width: '100%',
                borderRadius: 10,
                border: '1px solid var(--border)',
                marginBottom: 10,
              }}
            />
          )}
          {preview.ejemplo && (
            <p className="muted">
              Ejemplo de mensaje: «{preview.ejemplo.texto}»
            </p>
          )}
        </div>
      )}

      <div className="cards">
        {[
          ['Total', m.total],
          ['Enviados', m.enviados],
          ['Entregados', m.entregados],
          ['Leídos', m.leidos],
          ['Fallidos', m.fallidos],
        ].map(([label, val]) => (
          <div className="stat-card" key={label}>
            <div className="label">{label}</div>
            <div className="value">{val}</div>
            {label !== 'Total' && (
              <div className="progress">
                <span style={{ width: `${pct(val as number)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Registro de mensajes ({logsData?.total ?? 0})</h3>
        {(logsData?.total ?? 0) > 0 && (
          <Pagination
            page={logsPage}
            limit={logsLimit}
            total={logsData?.total ?? 0}
            onPageChange={setLogsPage}
            onLimitChange={(limit) => {
              setLogsLimit(limit);
              setLogsPage(1);
            }}
            limitOptions={LOGS_LIMIT_OPTIONS}
          />
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Meta status</th>
                <th>Message ID</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Cargando…
                  </td>
                </tr>
              ) : logsData && logsData.items.length > 0 ? (
                logsData.items.map((l) => (
                  <tr key={l._id}>
                    <td className="mono">{l.telefono}</td>
                    <td>
                      <Badge value={l.estado_actual} />
                    </td>
                    <td className="muted">{l.meta_message_status || '—'}</td>
                    <td className="mono muted">{l.whatsapp_message_id || '—'}</td>
                    <td className="muted">{l.error || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty">
                    Aún no hay mensajes. Lanza la campaña o usa «Enviar prueba».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(logsData?.total ?? 0) > 0 && (
          <Pagination
            page={logsPage}
            limit={logsLimit}
            total={logsData?.total ?? 0}
            onPageChange={setLogsPage}
            onLimitChange={(limit) => {
              setLogsLimit(limit);
              setLogsPage(1);
            }}
            limitOptions={LOGS_LIMIT_OPTIONS}
          />
        )}
      </div>
    </div>
  );
}
