import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Campaign, Paginated, Template } from '../types';

export function Campaigns() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<Paginated<Campaign> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<Campaign>>('/campaigns?limit=50'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Campañas</h1>
          <p>Crea y lanza envíos masivos dosificados.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nueva campaña
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Enviados</th>
              <th>Entregados</th>
              <th>Fallidos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty">
                  Cargando…
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((c) => (
                <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c._id}`)}>
                  <td>{c.nombre_campana}</td>
                  <td>
                    <Badge value={c.estado} />
                  </td>
                  <td>{c.metricas?.total ?? 0}</td>
                  <td>{c.metricas?.enviados ?? 0}</td>
                  <td>{c.metricas?.entregados ?? 0}</td>
                  <td>{c.metricas?.fallidos ?? 0}</td>
                  <td>
                    <button className="btn btn-sm">Ver</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  Sin campañas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewCampaignModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => {
            setShowModal(false);
            navigate(`/campaigns/${id}`);
          }}
        />
      )}
    </div>
  );
}

function NewCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [nombre, setNombre] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [mapeo, setMapeo] = useState<{ origen: string; valor: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Template[]>('/templates').then((t) => {
      setTemplates(t);
      if (t[0]) selectTemplate(t[0]._id, t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = (id: string, list = templates) => {
    setTemplateId(id);
    const tpl = list.find((t) => t._id === id);
    const count = tpl?.variables?.length ?? 0;
    setMapeo(Array.from({ length: count }).map(() => ({ origen: 'campo', valor: 'nombre' })));
  };

  const updateMapeo = (i: number, key: 'origen' | 'valor', value: string) => {
    setMapeo((m) => m.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<Campaign>('/campaigns', {
        method: 'POST',
        body: {
          nombre_campana: nombre,
          plantilla_id: templateId,
          segmento: {
            solo_activos: true,
            etiquetas: etiquetas
              ? etiquetas.split(',').map((s) => s.trim()).filter(Boolean)
              : [],
          },
          mapeo_variables: mapeo.map((m, i) => ({
            indice: i + 1,
            origen: m.origen,
            valor: m.valor,
          })),
        },
      });
      toast.success('Campaña creada');
      onCreated(res._id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nueva campaña" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre de la campaña</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Plantilla</label>
          <select value={templateId} onChange={(e) => selectTemplate(e.target.value)} required>
            <option value="">Selecciona…</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.nombre_meta} ({t.variables?.length ?? 0} vars)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Filtrar por etiquetas (opcional, coma)</label>
          <input
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
            placeholder="cali, premium"
          />
        </div>

        {mapeo.length > 0 && (
          <div className="field">
            <label>Mapeo de variables</label>
            {mapeo.map((m, i) => (
              <div className="row" key={i} style={{ marginBottom: 8 }}>
                <span className="mono" style={{ width: 42 }}>{`{{${i + 1}}}`}</span>
                <select
                  value={m.origen}
                  onChange={(e) => updateMapeo(i, 'origen', e.target.value)}
                  style={{ width: 130 }}
                >
                  <option value="campo">Campo cliente</option>
                  <option value="metadata">Metadata</option>
                  <option value="fijo">Valor fijo</option>
                </select>
                <input
                  style={{ flex: 1 }}
                  value={m.valor}
                  onChange={(e) => updateMapeo(i, 'valor', e.target.value)}
                  placeholder={m.origen === 'campo' ? 'nombre / telefono' : 'valor'}
                />
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
