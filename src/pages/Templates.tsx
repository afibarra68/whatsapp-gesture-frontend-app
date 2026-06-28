import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Template } from '../types';

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
            Plantillas de mensaje con variables {'{{1}}'}, {'{{2}}'}… y banner opcional.{' '}
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
              <th>Banner</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Cuerpo</th>
              <th>Vars</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
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
                    ) : t.header_tipo === 'text' ? (
                      <span className="muted">{t.header_text || 'Texto (Meta)'}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{t.categoria}</td>
                  <td>
                    <Badge value={t.estado} />
                  </td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 300 }} className="muted">
                    {t.cuerpo}
                  </td>
                  <td>{t.variables?.length ?? 0}</td>
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
  const normalizeHeaderTipo = (value?: string): 'none' | 'text' | 'image' => {
    if (value === 'text' || value === 'image') return value;
    return 'none';
  };

  const [headerTipo, setHeaderTipo] = useState<'none' | 'text' | 'image'>(
    normalizeHeaderTipo(template?.header_tipo),
  );
  const [headerUrl, setHeaderUrl] = useState(template?.header_url ?? '');
  const [headerText, setHeaderText] = useState(template?.header_text ?? '');
  const [cuerpo, setCuerpo] = useState(
    template?.cuerpo ??
      'Gracias por participar. A continuación encontrarás el detalle del evento.',
  );
  const [saving, setSaving] = useState(false);

  const variableIndices = Array.from(
    new Set([...(cuerpo.matchAll(/\{\{(\d+)\}\}/g))].map((m) => Number.parseInt(m[1], 10))),
  ).sort((a, b) => a - b);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedHeaderUrl = headerUrl.trim();
    if (headerTipo === 'image' && !trimmedHeaderUrl) {
      toast.error('Indica la URL de la imagen del banner');
      return;
    }
    setSaving(true);
    try {
      const variables = variableIndices.map((indice, i) => ({
        indice,
        nombre: template?.variables?.[i]?.nombre ?? `var${indice}`,
      }));
      const payload = {
        categoria,
        header_tipo: headerTipo,
        header_url: headerTipo === 'image' ? trimmedHeaderUrl : null,
        header_text: headerTipo === 'text' ? headerText.trim() || null : null,
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
    <Modal title={isEdit ? `Editar plantilla` : 'Nueva plantilla'} onClose={onClose}>
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
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as Template['categoria'])}>
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
          <label>Encabezado / Banner</label>
          <select
            value={headerTipo}
            onChange={(e) => setHeaderTipo(e.target.value as 'none' | 'text' | 'image')}
          >
            <option value="none">Sin encabezado</option>
            <option value="text">Texto (fijo en Meta)</option>
            <option value="image">Imagen (banner)</option>
          </select>
        </div>
        {headerTipo === 'text' && (
          <div className="field">
            <label>Texto del encabezado (referencia local, opcional)</label>
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Ej.: Invitación especial"
            />
            <small className="muted">
              El texto real lo define la plantilla aprobada en Meta. Aquí solo es referencia para el panel.
            </small>
          </div>
        )}
        {headerTipo === 'image' && (
          <div className="field">
            <label>URL pública de la imagen del banner</label>
            <input
              value={headerUrl ?? ''}
              onChange={(e) => setHeaderUrl(e.target.value)}
              placeholder="https://…/banner-evento.png"
            />
            {headerUrl && (
              <img
                src={headerUrl}
                alt="Vista previa del banner"
                style={{
                  marginTop: 10,
                  width: '100%',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                }}
              />
            )}
          </div>
        )}

        <div className="field">
          <label>
            Cuerpo
            {categoria === 'marketing'
              ? ' (variables {{1}}, {{2}}… opcionales)'
              : ' (usa {{1}}, {{2}}… si necesitas personalizar)'}
          </label>
          <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} required />
          <small className="muted">
            {variableIndices.length > 0
              ? `Variables detectadas: ${variableIndices.length}`
              : 'Sin variables — mensaje fijo para todos los destinatarios'}
          </small>
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
    </Modal>
  );
}
