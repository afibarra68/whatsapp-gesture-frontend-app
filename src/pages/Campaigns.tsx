import { FormEvent, MouseEvent, useCallback, useEffect, useState } from 'react';
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

  const remove = async (c: Campaign, e?: MouseEvent) => {
    e?.stopPropagation();
    if (c.estado === 'en_progreso') {
      toast.error('Pausa la campaña antes de eliminarla');
      return;
    }
    if (
      !confirm(
        `¿Eliminar la campaña "${c.nombre_campana}"? Se borrarán también sus registros de mensajes.`,
      )
    ) {
      return;
    }
    try {
      await api(`/campaigns/${c._id}`, { method: 'DELETE' });
      toast.success('Campaña eliminada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

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
                  <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => navigate(`/campaigns/${c._id}`)}>
                      Ver
                    </button>{' '}
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={c.estado === 'en_progreso'}
                      title={
                        c.estado === 'en_progreso'
                          ? 'Pausa la campaña antes de eliminar'
                          : undefined
                      }
                      onClick={(e) => remove(c, e)}
                    >
                      Eliminar
                    </button>
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
  const [diasPlanificados, setDiasPlanificados] = useState('7');
  const [topeDiario, setTopeDiario] = useState('');
  const [intervaloMin, setIntervaloMin] = useState('1');
  const [intervaloMax, setIntervaloMax] = useState('10');
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
      const configEnvio: {
        tope_diario?: number;
        dias_planificados?: number;
        intervalo_min_seg?: number;
        intervalo_max_seg?: number;
      } = {};
      if (topeDiario.trim()) {
        configEnvio.tope_diario = Number(topeDiario);
      } else if (diasPlanificados.trim()) {
        configEnvio.dias_planificados = Number(diasPlanificados);
      }
      const minSeg = Math.min(10, Math.max(1, Number(intervaloMin) || 1));
      const maxSeg = Math.min(10, Math.max(1, Number(intervaloMax) || 10));
      configEnvio.intervalo_min_seg = Math.min(minSeg, maxSeg);
      configEnvio.intervalo_max_seg = Math.max(minSeg, maxSeg);

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
          ...(Object.keys(configEnvio).length > 0 ? { config_envio: configEnvio } : {}),
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

        <div className="field">
          <label>Dosificación diaria</label>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
            El sistema calcula un tope por día y reparte los envíos en ventanas de 24 h.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12 }}>Días planificados</label>
              <input
                type="number"
                min={1}
                value={diasPlanificados}
                onChange={(e) => {
                  setDiasPlanificados(e.target.value);
                  setTopeDiario('');
                }}
                placeholder="7"
                disabled={!!topeDiario.trim()}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12 }}>O tope diario fijo</label>
              <input
                type="number"
                min={1}
                value={topeDiario}
                onChange={(e) => {
                  setTopeDiario(e.target.value);
                  if (e.target.value.trim()) setDiasPlanificados('');
                }}
                placeholder="ej. 500"
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label>Intervalo entre mensajes (segundos)</label>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
            Pausa aleatoria entre cada envío dentro de la campaña (1–10 s).
          </p>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12 }}>Mínimo</label>
              <input
                type="number"
                min={1}
                max={10}
                value={intervaloMin}
                onChange={(e) => setIntervaloMin(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12 }}>Máximo</label>
              <input
                type="number"
                min={1}
                max={10}
                value={intervaloMax}
                onChange={(e) => setIntervaloMax(e.target.value)}
              />
            </div>
          </div>
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
