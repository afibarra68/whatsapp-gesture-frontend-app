import { FormEvent, useState } from 'react';
import { api, apiBaseUrl } from '../api/client';
import { useToast } from '../components/Toast';

/**
 * Simula eventos de WhatsApp (sin SIM) golpeando /webhooks/simulate.
 * Útil para probar estados de entrega y respuestas del bot en modo simulación.
 */
export function Simulator() {
  const toast = useToast();

  // Estado de entrega
  const [wamid, setWamid] = useState('');
  const [estado, setEstado] = useState('entregado');

  // Mensaje entrante
  const [telefono, setTelefono] = useState('');
  const [texto, setTexto] = useState('Hola, ¿cuál es el precio?');

  const sendStatus = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api<{ updated: boolean }>('/webhooks/simulate', {
        method: 'POST',
        auth: false,
        body: { whatsapp_message_id: wamid, nuevo_estado: estado },
      });
      toast.success(res.updated ? 'Estado actualizado' : 'Sin cambios (idempotente)');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const sendInbound = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api<{ accion: string }>('/webhooks/simulate', {
        method: 'POST',
        auth: false,
        body: { telefono, texto },
      });
      toast.success(`Bot: ${res.accion}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Simulador de WhatsApp</h1>
          <p>Genera eventos de prueba sin una SIM real (modo simulación).</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Simular estado de entrega</h3>
          <form onSubmit={sendStatus}>
            <div className="field">
              <label>WhatsApp Message ID (wamid)</label>
              <input
                value={wamid}
                onChange={(e) => setWamid(e.target.value)}
                placeholder="wamid.SIM…"
                required
              />
              <small className="muted">
                Cópialo del registro de mensajes en el detalle de una campaña.
              </small>
            </div>
            <div className="field">
              <label>Nuevo estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="enviado">enviado</option>
                <option value="entregado">entregado</option>
                <option value="leido">leído</option>
                <option value="fallido">fallido</option>
              </select>
            </div>
            <button className="btn btn-primary btn-block">Enviar estado</button>
          </form>
        </div>

        <div className="card">
          <h3>Simular mensaje entrante (bot)</h3>
          <form onSubmit={sendInbound}>
            <div className="field">
              <label>Teléfono del cliente</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="573001000001"
                required
              />
            </div>
            <div className="field">
              <label>Mensaje del cliente</label>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required />
              <small className="muted">
                Prueba con "precio", "asesor" o "STOP" para ver distintas acciones del bot.
              </small>
            </div>
            <button className="btn btn-primary btn-block">Enviar mensaje</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>Conexión</h3>
        <p className="muted mono">API: {apiBaseUrl}</p>
      </div>
    </div>
  );
}
