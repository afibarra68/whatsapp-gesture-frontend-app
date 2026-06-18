import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Campaign, MessageLog, Paginated } from '../types';

interface Preview {
  total_destinatarios: number;
  banner?: string | null;
  ejemplo?: { texto: string } | null;
}

export function CampaignDetail() {
  const { id } = useParams();
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
        <div className="row">
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
        </div>
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
