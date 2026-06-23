import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import type { BotRule } from '../types';

const SYSTEM_MESSAGES = [
  {
    trigger: 'STOP, SALIR, BAJA, CANCELAR',
    respuesta: 'Has sido dado de baja. No recibirás más mensajes. Gracias.',
    accion: 'Opt-out del cliente',
  },
  {
    trigger: 'ASESOR, HUMANO, AGENTE',
    respuesta: 'Te estamos transfiriendo con un asesor. En breve te atenderá.',
    accion: 'Pasa la conversación a modo humano',
  },
];

function RuleFormModal({
  rule,
  onClose,
  onSaved,
}: {
  rule: BotRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [nombre, setNombre] = useState(rule?.nombre ?? '');
  const [keywords, setKeywords] = useState(rule?.palabras_clave.join(', ') ?? '');
  const [respuesta, setRespuesta] = useState(rule?.respuesta ?? '');
  const [prioridad, setPrioridad] = useState(rule?.prioridad ?? 0);
  const [activo, setActivo] = useState(rule?.activo ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const palabras_clave = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (!nombre.trim() || palabras_clave.length === 0 || !respuesta.trim()) {
      toast.error('Completa nombre, al menos una palabra clave y la respuesta');
      return;
    }

    setSaving(true);
    try {
      const body = {
        nombre: nombre.trim(),
        palabras_clave,
        respuesta: respuesta.trim(),
        respuesta_tipo: 'texto' as const,
        prioridad,
        activo,
      };

      if (rule) {
        await api(`/bot/rules/${rule._id}`, { method: 'PATCH', body });
        toast.success('Regla actualizada');
      } else {
        await api('/bot/rules', { method: 'POST', body });
        toast.success('Regla creada');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={rule ? 'Editar respuesta del bot' : 'Nueva respuesta del bot'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nombre interno</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej. precios, horarios, ubicacion"
          />
          <small className="muted">Solo para identificar la regla en el panel.</small>
        </div>

        <div className="field">
          <label>Palabras clave</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="precio, tarifa, costo"
          />
          <small className="muted">
            Separadas por coma. Si el cliente escribe alguna, el bot responde con el texto de abajo.
          </small>
        </div>

        <div className="field">
          <label>Respuesta del bot</label>
          <textarea
            rows={4}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Texto que enviará el bot por WhatsApp…"
          />
        </div>

        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Prioridad</label>
            <input
              type="number"
              value={prioridad}
              onChange={(e) => setPrioridad(Number(e.target.value))}
            />
            <small className="muted">Mayor número = se evalúa primero.</small>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Estado</label>
            <select value={activo ? 'true' : 'false'} onChange={(e) => setActivo(e.target.value === 'true')}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : rule ? 'Guardar cambios' : 'Crear regla'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Bot() {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<BotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BotRule | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<BotRule[]>('/bot/rules'));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.rol === 'admin') load();
  }, [load, user?.rol]);

  const openNew = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (rule: BotRule) => {
    setEditing(rule);
    setShowModal(true);
  };

  const toggleActive = async (rule: BotRule) => {
    try {
      await api(`/bot/rules/${rule._id}`, {
        method: 'PATCH',
        body: { activo: !rule.activo },
      });
      toast.success(rule.activo ? 'Regla desactivada' : 'Regla activada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (rule: BotRule) => {
    if (!confirm(`¿Eliminar la regla "${rule.nombre}"?`)) return;
    try {
      await api(`/bot/rules/${rule._id}`, { method: 'DELETE' });
      toast.success('Regla eliminada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (user?.rol !== 'admin') {
    return (
      <div>
        <div className="page-head">
          <div>
            <h1>Mensajes del bot</h1>
            <p>Solo administradores pueden editar las respuestas automáticas.</p>
          </div>
        </div>
        <div className="card">
          <p className="muted">
            Tu rol actual es <b>{user?.rol}</b>. Puedes revisar conversaciones en{' '}
            <Link to="/conversations">Conversaciones</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Mensajes del bot</h1>
          <p>Configura respuestas automáticas según palabras clave del cliente.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={openNew}>
            + Nueva respuesta
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Mensajes del sistema (fijos)</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Estos mensajes no se editan aquí; el bot los envía siempre que detecta estas palabras.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Disparador</th>
                <th>Respuesta</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_MESSAGES.map((m) => (
                <tr key={m.trigger}>
                  <td className="mono">{m.trigger}</td>
                  <td>{m.respuesta}</td>
                  <td className="muted">{m.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="toolbar">
        <span className="muted">{items.length} reglas configurables</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Palabras clave</th>
              <th>Respuesta</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Cargando…
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((rule) => (
                <tr key={rule._id}>
                  <td>{rule.nombre}</td>
                  <td className="muted">{rule.palabras_clave.join(', ')}</td>
                  <td style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{rule.respuesta}</td>
                  <td className="mono">{rule.prioridad}</td>
                  <td>
                    <Badge value={rule.activo ? 'activo' : 'inactivo'} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => openEdit(rule)}>
                        Editar
                      </button>
                      <button className="btn btn-sm" onClick={() => toggleActive(rule)}>
                        {rule.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(rule)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">
                  No hay reglas. Crea la primera con el botón de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <RuleFormModal
          rule={editing}
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
