import { Link } from 'react-router-dom';

export function TemplateMetaGuide() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Cómo armar una plantilla</h1>
          <p>Paso a paso: primero en WhatsApp oficial, después en este panel.</p>
        </div>
        <Link to="/templates" className="btn">
          ← Volver a plantillas
        </Link>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--accent, #25d366)' }}>
        <h3>Lo más importante (léelo primero)</h3>
        <ul className="muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>
            Las plantillas <b>no se crean solo aquí</b>. Primero debes crearlas y que las aprueben en
            la plataforma oficial de WhatsApp.
          </li>
          <li>
            Este panel es tu <b>copia interna</b>: guardas el mismo nombre y texto para usarla en
            campañas.
          </li>
          <li>
            El <b>nombre</b> debe ser <b>idéntico</b> en ambos lados (ej.{' '}
            <span className="mono">bono_ingreso_evento</span>).
          </li>
        </ul>
      </div>

      <div className="card">
        <h3>Paso 1 · Crear la plantilla en WhatsApp</h3>
        <ol className="muted" style={{ lineHeight: 2, paddingLeft: 18 }}>
          <li>
            Entra a{' '}
            <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noreferrer">
              WhatsApp Manager → Plantillas de mensajes
            </a>
            .
          </li>
          <li>
            Pulsa <b>Crear plantilla</b>.
          </li>
          <li>
            Elige la categoría:
            <ul style={{ marginTop: 6 }}>
              <li>
                <b>Marketing</b> — promociones, eventos, bonos, invitaciones.
              </li>
              <li>
                <b>Utilidad</b> — avisos de pedido, recordatorios, confirmaciones.
              </li>
              <li>
                <b>Autenticación</b> — códigos de verificación (OTP).
              </li>
            </ul>
          </li>
          <li>
            <b>Nombre:</b> minúsculas y guiones bajos, sin espacios. Ejemplo:{' '}
            <span className="mono">bono_ingreso_evento</span>
          </li>
          <li>
            <b>Idioma:</b> Español (<span className="mono">es</span>).
          </li>
          <li>
            <b>Cuerpo:</b> escribe el mensaje. Donde quieras personalizar, usa variables:{' '}
            <span className="mono">{'{{1}}'}</span> para el nombre, <span className="mono">{'{{2}}'}</span>{' '}
            para otro dato, etc.
          </li>
          <li>
            <b>Encabezado (opcional):</b> puedes poner una imagen (banner del evento).
          </li>
          <li>
            <b>Botones (opcional):</b> tipo respuesta rápida. Máximo <b>25 caracteres</b> por botón.
            Ejemplos que sí caben: <span className="mono">Ya compré mi bono</span>,{' '}
            <span className="mono">Quiero más info</span>.
          </li>
          <li>
            Envía a revisión y espera estado <b>Aprobada</b> (puede tardar minutos u horas).
          </li>
        </ol>
      </div>

      <div className="card">
        <h3>Ejemplo listo para copiar</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>
                  <b>Nombre</b>
                </td>
                <td className="mono">bono_ingreso_evento</td>
              </tr>
              <tr>
                <td>
                  <b>Categoría</b>
                </td>
                <td>Marketing</td>
              </tr>
              <tr>
                <td>
                  <b>Cuerpo</b>
                </td>
                <td style={{ whiteSpace: 'pre-wrap' }}>
                  {`Hola {{1}}, gracias por tu interés en nuestro evento.

Si ya compraste tu bono de ingreso, confírmalo con el botón de abajo. Si necesitas más información, también puedes pulsar el botón correspondiente.

¡Te esperamos!`}
                </td>
              </tr>
              <tr>
                <td>
                  <b>Botones</b>
                </td>
                <td>
                  <span className="mono">Ya compré mi bono</span> ·{' '}
                  <span className="mono">Quiero más info</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Paso 2 · Registrar la plantilla en este panel</h3>
        <ol className="muted" style={{ lineHeight: 2, paddingLeft: 18 }}>
          <li>
            Ve a <Link to="/templates">Plantillas → + Nueva plantilla</Link>.
          </li>
          <li>
            Copia <b>exactamente</b> lo mismo que aprobó WhatsApp:
            <ul style={{ marginTop: 6 }}>
              <li>
                Nombre → campo <b>Nombre</b>
              </li>
              <li>
                Idioma → <span className="mono">es</span>
              </li>
              <li>
                Categoría → marketing / utility / authentication
              </li>
              <li>
                Cuerpo → mismo texto con <span className="mono">{'{{1}}'}</span>,{' '}
                <span className="mono">{'{{2}}'}</span>…
              </li>
              <li>
                Banner → URL pública si la plantilla tiene imagen
              </li>
            </ul>
          </li>
          <li>
            Marca estado <b>aprobada</b> cuando WhatsApp la haya aprobado.
          </li>
        </ol>
      </div>

      <div className="card">
        <h3>Paso 3 · Cómo se rellenan {'{{1}}'} y {'{{2}}'}</h3>
        <p className="muted">
          Las variables <b>no se rellenan solas</b>. Al crear una campaña, indicas de dónde sale cada
          dato:
        </p>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Origen</th>
                <th>Ejemplo</th>
                <th>Resultado para Juan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">{'{{1}}'}</td>
                <td>Campo cliente → nombre</td>
                <td className="mono">nombre</td>
                <td>Hola <b>Juan</b>, gracias…</td>
              </tr>
              <tr>
                <td className="mono">{'{{2}}'}</td>
                <td>Valor fijo</td>
                <td className="mono">BONO-2026</td>
                <td>…tu código es <b>BONO-2026</b></td>
              </tr>
              <tr>
                <td className="mono">{'{{2}}'}</td>
                <td>Metadata → ciudad</td>
                <td className="mono">ciudad</td>
                <td>…desde <b>Cali</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          En el detalle de la campaña verás un <b>Preview</b> con un mensaje de ejemplo antes de
          lanzar.
        </p>
      </div>

      <div className="card">
        <h3>Reglas que WhatsApp exige (y aquí no validamos)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Regla</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Botones</td>
                <td>Máx. 25 caracteres por botón. Solo existen si los creaste en WhatsApp Manager.</td>
              </tr>
              <tr>
                <td>Variables</td>
                <td>
                  Usa <span className="mono">{'{{1}}'}</span>, <span className="mono">{'{{2}}'}</span>… en
                  orden. No empieces ni termines el texto solo con una variable.
                </td>
              </tr>
              <tr>
                <td>Aprobación</td>
                <td>Sin aprobación oficial no se puede enviar a clientes que no te escribieron.</td>
              </tr>
              <tr>
                <td>Imagen banner</td>
                <td>URL pública HTTPS al enviar (en campañas usa la misma que en la plantilla).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Checklist rápido</h3>
        <ul className="muted" style={{ lineHeight: 2, paddingLeft: 18, listStyle: 'none' }}>
          <li>☐ Plantilla creada en WhatsApp Manager</li>
          <li>☐ Estado <b>Aprobada</b> en WhatsApp</li>
          <li>☐ Misma plantilla registrada aquí con el mismo nombre</li>
          <li>☐ Estado <b>aprobada</b> en este panel</li>
          <li>☐ Campaña creada con mapeo de {'{{1}}'}, {'{{2}}'}…</li>
          <li>☐ Preview revisado → Lanzar campaña</li>
        </ul>
        <div style={{ marginTop: 16 }}>
          <Link to="/templates" className="btn btn-primary">
            Ir a Plantillas
          </Link>
          <Link to="/campaigns" className="btn" style={{ marginLeft: 8 }}>
            Crear campaña
          </Link>
        </div>
      </div>
    </div>
  );
}
