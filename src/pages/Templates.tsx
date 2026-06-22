import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Template, TemplateButton } from '../types';

const EMPTY_BUTTON = (): TemplateButton => ({ tipo: 'quick_reply', texto: '' });

function renderVars(text: string, count: number): string {
  let out = text;
  for (let i = 1; i <= count; i++) {
    out = out.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), `[var${i}]`);
  }
  return out;
}

function TemplatePreview({
  headerTipo,
  headerUrl,
  headerText,
  cuerpo,
  footer,
  botones,
  varCount,
}: {
  headerTipo: 'none' | 'image' | 'text';
  headerUrl: string;
  headerText: string;
  cuerpo: string;
  footer: string;
  botones: TemplateButton[];
  varCount: number;
}) {
  return (
    <div
      style={{
        background: '#e5ddd5',
        borderRadius: 12,
        padding: 16,
        maxWidth: 320,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,.12)',
        }}
      >
        {headerTipo === 'image' && headerUrl && (
          <img src={headerUrl} alt="header" style={{ width: '100%', display: 'block' }} />
        )}
        <div style={{ padding: '10px 12px' }}>
          {headerTipo === 'text' && headerText && (
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              {renderVars(headerText, varCount)}
            </div>
          )}
          <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
            {renderVars(cuerpo, varCount)}
          </div>
          {footer && (
            <div style={{ fontSize: 12, color: '#667781', marginTop: 8 }}>{footer}</div>
          )}
        </div>
        {botones.filter((b) => b.texto.trim()).map((btn, i) => (
          <div
            key={i}
            style={{
              borderTop: '1px solid #e9edef',
              padding: '10px 12px',
              textAlign: 'center',
              color: '#008069',
              fontSize: 14,
            }}
          >
            ↩ {btn.texto}
          </div>
        ))}
      </div>
      <small className="muted" style={{ display: 'block', marginTop: 8 }}>
        Vista previa aproximada (como en WhatsApp Manager)
      </small>
    </div>
  );
}

export function Templates() {
  const toast = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<Template[]>('/templates'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (t: Template) => {
    setEditing(t);
    setShowModal(true);
  };

  const remove = async (t: Template) => {
    if (!confirm(`¿Eliminar la plantilla "${t.nombre_meta}"?`)) return;
    try {
      await api(`/templates/${t._id}`, { method: 'DELETE' });
      toast.success('Plantilla eliminada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Plantillas</h1>
          <p>
            Registra plantillas con título, cuerpo, pie y botones igual que en Meta WhatsApp Manager.{' '}
            <Link to="/templates/guia">Ver guía paso a paso</Link>.
          </p>
        </div>
        <div className="row">
          <Link to="/templates/guia" className="btn">
            Guía paso a paso
          </Link>
          <button className="btn btn-primary" onClick={openNew}>
            + Nueva plantilla
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre Meta</th>
              <th>Encabezado</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Cuerpo</th>
              <th>Botones</th>
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
            ) : items.length > 0 ? (
              items.map((t) => (
                <tr key={t._id}>
                  <td className="mono">{t.nombre_meta}</td>
                  <td>
                    {t.header_tipo === 'image' && t.header_url ? (
                      <img
                        src={t.header_url}
                        alt="banner"
                        style={{ height: 34, borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    ) : t.header_tipo === 'text' && t.header_text ? (
                      <span className="muted">{t.header_text}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{t.categoria}</td>
                  <td>
                    <Badge value={t.estado} />
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 280 }} className="muted">
                    {t.cuerpo}
                  </td>
                  <td>{t.botones?.length ?? 0}</td>
                  <td className="row">
                    <button className="btn btn-sm" onClick={() => openEdit(t)}>
                      Editar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  Sin plantillas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = !!template;

  const [nombre, setNombre] = useState(template?.nombre_meta ?? '');
  const [idioma, setIdioma] = useState(template?.idioma ?? 'es');
  const [categoria, setCategoria] = useState(template?.categoria ?? 'marketing');
  const [estado, setEstado] = useState(template?.estado ?? 'borrador');
  const [headerTipo, setHeaderTipo] = useState<'none' | 'image' | 'text'>(
    template?.header_tipo ?? 'none',
  );
  const [headerUrl, setHeaderUrl] = useState(template?.header_url ?? '');
  const [headerText, setHeaderText] = useState(template?.header_text ?? '');
  const [footer, setFooter] = useState(template?.footer ?? '');
  const [botones, setBotones] = useState<TemplateButton[]>(
    template?.botones?.length ? template.botones : [],
  );
  const [cuerpo, setCuerpo] = useState(
    template?.cuerpo ??
      'Hola {{1}}, te recordamos que tienes un pago en proceso para el bono {{2}}.',
  );
  const [saving, setSaving] = useState(false);

  const varCount = useMemo(
    () => Array.from(new Set((cuerpo.match(/\{\{(\d+)\}\}/g) || []))).length,
    [cuerpo],
  );

  const updateButton = (index: number, patch: Partial<TemplateButton>) => {
    setBotones((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (headerTipo === 'image' && !headerUrl) {
      toast.error('Indica la URL de la imagen del encabezado');
      return;
    }
    if (headerTipo === 'text' && !headerText.trim()) {
      toast.error('Indica el título del encabezado');
      return;
    }
    const cleanButtons = botones.filter((b) => b.texto.trim());
    setSaving(true);
    try {
      const variables = Array.from({ length: varCount }).map((_, i) => ({
        indice: i + 1,
        nombre: template?.variables?.[i]?.nombre ?? `var${i + 1}`,
      }));
      const payload = {
        categoria,
        header_tipo: headerTipo,
        header_url: headerTipo === 'image' ? headerUrl : null,
        header_text: headerTipo === 'text' ? headerText : null,
        footer: footer.trim() || null,
        botones: cleanButtons,
        cuerpo,
        variables,
      };
      if (isEdit) {
        await api(`/templates/${template!._id}`, {
          method: 'PATCH',
          body: { ...payload, estado },
        });
        toast.success('Plantilla actualizada');
      } else {
        await api('/templates', {
          method: 'POST',
          body: { ...payload, nombre_meta: nombre, idioma },
        });
        toast.success('Plantilla creada');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Editar plantilla' : 'Nueva plantilla'} onClose={onClose}>
      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <form onSubmit={submit}>
          <div className="field">
            <label>Nombre (igual al aprobado en Meta)</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={isEdit}
            />
            {isEdit && <small className="muted">El nombre no se puede cambiar tras crearla.</small>}
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Idioma</label>
              <input value={idioma} onChange={(e) => setIdioma(e.target.value)} disabled={isEdit} />
            </div>
            <div className="field">
              <label>Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Template['categoria'])}
              >
                <option value="utility">utility</option>
                <option value="marketing">marketing</option>
                <option value="authentication">authentication</option>
              </select>
            </div>
          </div>

          {isEdit && (
            <div className="field">
              <label>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as Template['estado'])}>
                <option value="borrador">borrador</option>
                <option value="pendiente">pendiente</option>
                <option value="aprobada">aprobada</option>
                <option value="rechazada">rechazada</option>
              </select>
            </div>
          )}

          <div className="field">
            <label>Encabezado</label>
            <select
              value={headerTipo}
              onChange={(e) => setHeaderTipo(e.target.value as 'none' | 'image' | 'text')}
            >
              <option value="none">Sin encabezado</option>
              <option value="text">Título (texto)</option>
              <option value="image">Imagen (banner)</option>
            </select>
          </div>

          {headerTipo === 'text' && (
            <div className="field">
              <label>Título del encabezado</label>
              <input
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Confirmacion compra de bono"
                required
              />
            </div>
          )}

          {headerTipo === 'image' && (
            <div className="field">
              <label>URL pública de la imagen</label>
              <input
                value={headerUrl ?? ''}
                onChange={(e) => setHeaderUrl(e.target.value)}
                placeholder="https://…/banner.png"
              />
            </div>
          )}

          <div className="field">
            <label>Cuerpo (usa {'{{1}}'}, {'{{2}}'}…)</label>
            <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} required rows={5} />
            <small className="muted">Variables detectadas: {varCount}</small>
          </div>

          <div className="field">
            <label>Pie de página (footer)</label>
            <input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="finalizar pago de bono vigilia"
            />
          </div>

          <div className="field">
            <label>Botones (máx. 3, como en Meta)</label>
            {botones.map((btn, i) => (
              <div key={i} className="row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <select
                  value={btn.tipo}
                  onChange={(e) =>
                    updateButton(i, { tipo: e.target.value as TemplateButton['tipo'] })
                  }
                  style={{ minWidth: 120 }}
                >
                  <option value="quick_reply">Respuesta rápida</option>
                  <option value="url">URL</option>
                  <option value="phone">Teléfono</option>
                </select>
                <input
                  value={btn.texto}
                  onChange={(e) => updateButton(i, { texto: e.target.value })}
                  placeholder="Texto del botón"
                  style={{ flex: 1, minWidth: 140 }}
                />
                {btn.tipo === 'url' && (
                  <input
                    value={btn.url ?? ''}
                    onChange={(e) => updateButton(i, { url: e.target.value })}
                    placeholder="https://…"
                    style={{ flex: 1, minWidth: 140 }}
                  />
                )}
                {btn.tipo === 'phone' && (
                  <input
                    value={btn.telefono ?? ''}
                    onChange={(e) => updateButton(i, { telefono: e.target.value })}
                    placeholder="+573…"
                    style={{ minWidth: 120 }}
                  />
                )}
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setBotones((p) => p.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </div>
            ))}
            {botones.length < 3 && (
              <button type="button" className="btn btn-sm" onClick={() => setBotones((p) => [...p, EMPTY_BUTTON()])}>
                + Agregar botón
              </button>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>

        <TemplatePreview
          headerTipo={headerTipo}
          headerUrl={headerUrl}
          headerText={headerText}
          cuerpo={cuerpo}
          footer={footer}
          botones={botones}
          varCount={varCount}
        />
      </div>
    </Modal>
  );
}
