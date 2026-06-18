import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Conversation } from '../types';

export function Conversations() {
  const toast = useToast();
  const [items, setItems] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter ? `?modo=${filter}` : '';
      setItems(await api<Conversation[]>(`/conversations${qs}`));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handoff = async (id: string) => {
    try {
      await api(`/conversations/${id}/handoff`, { method: 'POST' });
      toast.success('Conversación pasada a humano');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const reply = async (c: Conversation) => {
    const texto = prompt(`Responder a ${c.telefono}:`);
    if (!texto) return;
    try {
      await api(`/conversations/${c._id}/reply`, { method: 'POST', body: { texto } });
      toast.success('Respuesta enviada');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const isOpen = (c: Conversation) =>
    c.ventana_abierta_hasta && new Date(c.ventana_abierta_hasta) > new Date();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Conversaciones</h1>
          <p>Respuestas de clientes y estado del bot.</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todas</option>
          <option value="bot">Bot</option>
          <option value="humano">Humano</option>
        </select>
        <div className="spacer" />
        <span className="muted">{items.length} conversaciones</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Teléfono</th>
              <th>Modo</th>
              <th>Ventana 24h</th>
              <th>Último mensaje</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty">
                  Cargando…
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((c) => (
                <tr key={c._id}>
                  <td className="mono">{c.telefono}</td>
                  <td>
                    <Badge value={c.modo} />
                  </td>
                  <td>
                    {isOpen(c) ? (
                      <Badge value="activo" />
                    ) : (
                      <span className="muted">cerrada</span>
                    )}
                  </td>
                  <td className="muted" style={{ whiteSpace: 'normal', maxWidth: 280 }}>
                    {c.ultimo_mensaje_entrante || '—'}
                  </td>
                  <td className="row">
                    {c.modo === 'bot' && (
                      <button className="btn btn-sm" onClick={() => handoff(c._id)}>
                        A humano
                      </button>
                    )}
                    {isOpen(c) && (
                      <button className="btn btn-sm btn-primary" onClick={() => reply(c)}>
                        Responder
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty">
                  Sin conversaciones todavía. Usa el Simulador para generar mensajes entrantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
