import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Conversation, ConversationMessage } from '../types';

const POLL_MS = 4000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(estado: ConversationMessage['estado']) {
  switch (estado) {
    case 'enviado':
      return '✓';
    case 'entregado':
      return '✓✓';
    case 'leido':
      return '✓✓';
    case 'fallido':
      return '✗';
    default:
      return '';
  }
}

function origenLabel(origen: ConversationMessage['origen']) {
  switch (origen) {
    case 'bot':
      return 'Bot';
    case 'agente':
      return 'Tú';
    case 'sistema':
      return 'Sistema';
    default:
      return '';
  }
}

export function Conversations() {
  const toast = useToast();
  const [items, setItems] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const selected = items.find((c) => c._id === selectedId) ?? null;

  const loadList = useCallback(async () => {
    try {
      const qs = filter ? `?modo=${filter}` : '';
      const list = await api<Conversation[]>(`/conversations${qs}`);
      setItems(list);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  const loadMessages = useCallback(
    async (id: string, silent = false) => {
      if (!silent) setLoadingMsgs(true);
      try {
        const msgs = await api<ConversationMessage[]>(`/conversations/${id}/messages`);
        setMessages(msgs);
      } catch (err) {
        if (!silent) toast.error((err as Error).message);
      } finally {
        if (!silent) setLoadingMsgs(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedId);
    const t = setInterval(() => {
      loadList();
      loadMessages(selectedId, true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [selectedId, loadList, loadMessages]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const isOpen = (c: Conversation) =>
    c.ventana_abierta_hasta && new Date(c.ventana_abierta_hasta) > new Date();

  const handoff = async () => {
    if (!selected) return;
    try {
      await api(`/conversations/${selected._id}/handoff`, { method: 'POST' });
      toast.success('Conversación pasada a humano');
      loadList();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !texto.trim()) return;
    setSending(true);
    try {
      const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
      await api(`/conversations/${selected._id}/reply`, {
        method: 'POST',
        body: {
          texto: texto.trim(),
          reply_to_message_id: lastInbound?.whatsapp_message_id ?? undefined,
        },
      });
      setTexto('');
      await loadMessages(selected._id, true);
      await loadList();
      toast.success('Mensaje enviado');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Conversaciones</h1>
          <p>Historial en tiempo real, respuestas personalizadas y estado de entrega.</p>
        </div>
      </div>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Todas</option>
              <option value="bot">Bot</option>
              <option value="humano">Humano</option>
            </select>
          </div>

          <div className="chat-list">
            {loading ? (
              <p className="muted" style={{ padding: 16 }}>
                Cargando…
              </p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ padding: 16 }}>
                Sin conversaciones. Usa el Simulador o espera respuestas de clientes.
              </p>
            ) : (
              items.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className={`chat-list-item${selectedId === c._id ? ' active' : ''}`}
                  onClick={() => setSelectedId(c._id)}
                >
                  <div className="chat-list-top">
                    <strong>{c.cliente_nombre || c.telefono}</strong>
                    {c.espera_respuesta && <span className="chat-badge-new">Nuevo</span>}
                  </div>
                  <div className="chat-list-meta">
                    <span className="mono">{c.cliente_nombre ? c.telefono : ''}</span>
                    <Badge value={c.modo} />
                  </div>
                  <p className="chat-list-preview">{c.ultimo_mensaje_entrante || 'Sin mensajes'}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="chat-panel">
          {!selected ? (
            <div className="chat-empty">
              <p>Selecciona una conversación para ver el hilo y responder.</p>
            </div>
          ) : (
            <>
              <header className="chat-header">
                <div>
                  <h2>{selected.cliente_nombre || selected.telefono}</h2>
                  <p className="muted mono">{selected.telefono}</p>
                </div>
                <div className="row">
                  {isOpen(selected) ? (
                    <Badge value="activo" />
                  ) : (
                    <span className="muted">Ventana 24h cerrada</span>
                  )}
                  <Badge value={selected.modo} />
                  {selected.modo === 'bot' && (
                    <button type="button" className="btn btn-sm" onClick={handoff}>
                      A humano
                    </button>
                  )}
                </div>
              </header>

              <div className="chat-thread" ref={threadRef}>
                {loadingMsgs ? (
                  <p className="muted">Cargando mensajes…</p>
                ) : messages.length === 0 ? (
                  <p className="muted">
                    Aún no hay historial guardado. Los mensajes nuevos aparecerán aquí.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m._id}
                      className={`chat-bubble ${m.direction === 'inbound' ? 'inbound' : 'outbound'}`}
                    >
                      {m.direction === 'outbound' && m.origen !== 'agente' && (
                        <span className="chat-bubble-origen">{origenLabel(m.origen)}</span>
                      )}
                      <p>{m.texto}</p>
                      <footer className="chat-bubble-foot">
                        <time>{formatTime(m.createdAt)}</time>
                        {m.direction === 'outbound' && (
                          <span
                            className={`chat-status${m.estado === 'leido' ? ' read' : ''}`}
                            title={m.estado ?? 'enviado'}
                          >
                            {statusLabel(m.estado)}
                          </span>
                        )}
                      </footer>
                    </div>
                  ))
                )}
              </div>

              <form className="chat-compose" onSubmit={sendReply}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={
                    isOpen(selected)
                      ? 'Escribe un mensaje personalizado…'
                      : 'Ventana cerrada — usa una plantilla en Campañas'
                  }
                  rows={2}
                  disabled={!isOpen(selected) || sending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isOpen(selected) || sending || !texto.trim()}
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
