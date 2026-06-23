import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Campaign, CampaignPlanEnvio, MessageLog, Paginated } from '../types';

interface Preview {
  total_destinatarios: number;
  plan_envio?: CampaignPlanEnvio;
  banner?: string | null;
  ejemplo?: { texto: string } | null;
}

export function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [camp, logsRes] = await Promise.all([
        api<Campaign>(`/campaigns/${id}`),
        api<Paginated<MessageLog>>(`/campaigns/${id}/logs?limit=200`),
      ]);
      setCampaign(camp);
      setLogs(logsRes.items);
      if (camp.estado === 'borrador') {
        api<Preview>(`/campaigns/${id}/preview`).then(setPreview).catch(() => {});
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresca mientras está en progreso.
  useEffect(() => {
    if (campaign?.estado !== 'en_progreso') return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [campaign?.estado, load]);

  const action = async (verb: 'launch' | 'pause' | 'resume') => {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/campaigns/${id}/${verb}`, { method: 'POST' });
      toast.success(`Acción "${verb}" ejecutada`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !campaign) return;
    if (campaign.estado === 'en_progreso') {
      toast.error('Pausa la campaña antes de eliminarla');
      return;
    }
    if (
      !confirm(
        `¿Eliminar la campaña "${campaign.nombre_campana}"? Se borrarán también sus registros de mensajes.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api(`/campaigns/${id}`, { method: 'DELETE' });
      toast.success('Campaña eliminada');
      navigate('/campaigns');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!campaign) return <div className="empty">Cargando campaña…</div>;

  const m = campaign.metricas;
  const pct = (n: number) => (m.total > 0 ? Math.round((n / m.total) * 100) : 0);

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
          </p>
        </div>
        <div className="head-actions">
          {campaign.estado === 'borrador' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => action('launch')}>
              ➤ Lanzar campaña
            </button>
          )}
          {campaign.estado === 'en_progreso' && (
            <button className="btn" disabled={busy} onClick={() => action('pause')}>
              ⏸ Pausar
            </button>
          )}
          {campaign.estado === 'pausada' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => action('resume')}>
              ▶ Reanudar
            </button>
          )}
          <button
            className="btn btn-danger"
            disabled={busy || campaign.estado === 'en_progreso'}
            title={
              campaign.estado === 'en_progreso'
                ? 'Pausa la campaña antes de eliminar'
                : undefined
            }
            onClick={remove}
          >
            Eliminar
          </button>
        </div>
      </div>

      {campaign.estado === 'borrador' && preview && (
        <div className="card">
          <h3>Vista previa</h3>
          <p>
            Destinatarios estimados: <b>{preview.total_destinatarios}</b>
          </p>
          {preview.plan_envio && preview.total_destinatarios > 0 && (
            <div className="muted" style={{ marginBottom: 12 }}>
              <p>
                Plan de envío: <b>{preview.plan_envio.tope_diario}</b> mensajes/día durante{' '}
                <b>{preview.plan_envio.dias_estimados}</b> día
                {preview.plan_envio.dias_estimados !== 1 ? 's' : ''}
                {preview.plan_envio.dias_estimados > 1 && (
                  <>
                    {' '}
                    (último día: <b>{preview.plan_envio.mensajes_ultimo_dia}</b>)
                  </>
                )}
              </p>
            </div>
          )}
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

      {campaign.config_envio?.tope_diario && campaign.estado !== 'borrador' && (
        <div className="card">
          <h3>Dosificación</h3>
          <p className="muted">
            Tope diario: <b>{campaign.config_envio.tope_diario}</b> · Activados hoy:{' '}
            <b>{campaign.config_envio.enviados_en_ventana ?? 0}</b>
            {campaign.metricas.pendientes != null && campaign.metricas.pendientes > 0 && (
              <>
                {' '}
                · Pendientes de liberar: <b>{campaign.metricas.pendientes}</b>
              </>
            )}
            {(campaign.config_envio.intervalo_min_seg != null ||
              campaign.config_envio.intervalo_max_seg != null) && (
              <>
                <br />
                Intervalo entre mensajes:{' '}
                <b>
                  {campaign.config_envio.intervalo_min_seg ?? 1}–
                  {campaign.config_envio.intervalo_max_seg ?? 10} s
                </b>{' '}
                (aleatorio)
              </>
            )}
          </p>
        </div>
      )}

      <div className="cards">
        {[
          ['Total', m.total],
          ...(m.pendientes != null && m.pendientes > 0 ? [['Pendientes', m.pendientes] as const] : []),
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
        <h3>Registro de mensajes ({logs.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Message ID</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((l) => (
                  <tr key={l._id}>
                    <td className="mono">{l.telefono}</td>
                    <td>
                      <Badge value={l.estado_actual} />
                    </td>
                    <td className="mono muted">{l.whatsapp_message_id || '—'}</td>
                    <td className="muted">{l.error || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty">
                    Aún no hay mensajes. Lanza la campaña.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
