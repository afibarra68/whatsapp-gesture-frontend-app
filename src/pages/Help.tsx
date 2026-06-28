export function Help() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Guía de uso</h1>
          <p>Material de lectura para operar la aplicación paso a paso.</p>
        </div>
      </div>

      <div className="card">
        <h3>¿Qué hace esta aplicación?</h3>
        <p className="muted">
          Permite enviar mensajes de WhatsApp de forma masiva a tus clientes registrados, controlar
          el estado de cada mensaje y responder automáticamente con un bot. Hoy funciona en{' '}
          <b>modo simulación</b>: hace todo el proceso real (campañas, colas, estados, bot) pero sin
          enviar a WhatsApp de verdad ni cobrar. Al conectar la cuenta oficial de Meta, el mismo
          panel enviará mensajes reales sin cambiar tu forma de trabajar.
        </p>
      </div>

      <div className="card">
        <h3>Flujo de trabajo (en orden)</h3>
        <ol className="muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>
            <b>Clientes</b> — ten clientes activos y con consentimiento (opt-in). Teléfono sin “+”,
            solo dígitos con código de país (ej. <span className="mono">573001234567</span>).
          </li>
          <li>
            <b>Plantillas</b> — crea el texto con variables{' '}
            <span className="mono">{'{{1}}'}</span>, <span className="mono">{'{{2}}'}</span>…
          </li>
          <li>
            <b>Campañas → Nueva</b> — elige plantilla, (opcional) filtra por etiquetas y mapea cada
            variable (campo del cliente, metadata o valor fijo).
          </li>
          <li>
            <b>Detalle → Preview</b> — revisa destinatarios y un ejemplo del mensaje armado.
          </li>
          <li>
            <b>Lanzar</b> — el envío sale dosificado. Las métricas se actualizan solas. Puedes
            Pausar/Reanudar.
          </li>
          <li>
            <b>Monitorear</b> — mira métricas y el registro de mensajes con su Message ID (wamid).
          </li>
        </ol>
      </div>

      <div className="card">
        <h3>El Simulador tiene dos cajas distintas</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Caja</th>
                <th>Para qué</th>
                <th>Qué va en el campo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Simular estado de entrega</td>
                <td>Marcar un mensaje enviado como entregado/leído/fallido</td>
                <td>
                  El <b>wamid</b> (no un teléfono). Cópialo del registro de mensajes de una campaña:
                  <span className="mono"> wamid.SIM.573001000001.A1B2…</span>
                </td>
              </tr>
              <tr>
                <td>Simular mensaje entrante (bot)</td>
                <td>Simular que un cliente te escribe</td>
                <td>
                  El <b>teléfono</b> de un cliente que exista:{' '}
                  <span className="mono">573001000001</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          El estado solo avanza (encolado → enviado → entregado → leído / fallido); nunca retrocede.
        </p>
      </div>

      <div className="card">
        <h3>Acciones del bot (qué responde y por qué)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Resultado</th>
                <th>Significado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">regla:&lt;nombre&gt;</td>
                <td>Coincidió una palabra clave y el bot respondió esa regla.</td>
              </tr>
              <tr>
                <td className="mono">opt_out</td>
                <td>El cliente escribió STOP/SALIR → se le da de baja.</td>
              </tr>
              <tr>
                <td className="mono">handoff</td>
                <td>Escribió ASESOR/HUMANO → pasa a un agente humano.</td>
              </tr>
              <tr>
                <td className="mono">modo_humano_sin_respuesta</td>
                <td>La conversación ya está con un humano → el bot no interviene.</td>
              </tr>
              <tr>
                <td className="mono">sin_coincidencia</td>
                <td>No coincidió ninguna regla → el bot no responde.</td>
              </tr>
              <tr>
                <td className="mono">ignorado_no_registrado</td>
                <td>El teléfono no está en la base de clientes → se ignora a propósito.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Glosario rápido</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>
                  <b>Opt-in / Opt-out</b>
                </td>
                <td>Consentimiento para recibir / baja. Sin opt-in no se envía.</td>
              </tr>
              <tr>
                <td>
                  <b>Plantilla</b>
                </td>
                <td>Texto con variables aprobado (en producción) por Meta.</td>
              </tr>
              <tr>
                <td>
                  <b>wamid</b>
                </td>
                <td>Identificador único de un mensaje ya enviado.</td>
              </tr>
              <tr>
                <td>
                  <b>Ventana 24h</b>
                </td>
                <td>Tras una respuesta del cliente, 24h para chatear con texto libre.</td>
              </tr>
              <tr>
                <td>
                  <b>Roles</b>
                </td>
                <td>admin (todo), operador (clientes/plantillas/campañas), agente (conversaciones).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Preguntas frecuentes</h3>
        <p className="muted">
          <b>¿Por qué no se envió a todos?</b> Solo se envía a clientes activos y con opt-in.
          <br />
          <b>¿“Sin cambios” en el simulador de estado?</b> Ese estado ya estaba aplicado o sería un
          retroceso (es idempotente).
          <br />
          <b>¿El bot ignoró mi mensaje?</b> El teléfono no está registrado como cliente.
          <br />
          <b>¿Ya envía WhatsApp reales?</b> No todavía: está en modo simulación.
        </p>
      </div>
    </div>
  );
}
