import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Client, Paginated } from '../types';
import { parseContactsCsv, type CsvImportFormat, type ParsedContact } from '../utils/googleContacts';

export function Clients() {
  const toast = useToast();
  const [data, setData] = useState<Paginated<Client> | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (filter) qs.set('activo', filter);
      qs.set('limit', '100');
      const res = await api<Paginated<Client>>(`/clients?${qs.toString()}`);
      setData(res);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const optOut = async (id: string) => {
    try {
      await api(`/clients/${id}/opt-out`, { method: 'POST' });
      toast.success('Cliente dado de baja');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Clientes</h1>
          <p>Base de clientes registrados y su consentimiento.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setShowImport(true)}>
            Importar CSV
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowPurge(true)}
            disabled={(data?.total ?? 0) === 0}
          >
            Eliminar todos
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <div className="spacer" />
        <span className="muted">{data?.total ?? 0} clientes</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Opt-in</th>
              <th>Etiquetas</th>
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
            ) : data && data.items.length > 0 ? (
              data.items.map((c) => (
                <tr key={c._id}>
                  <td>{c.nombre}</td>
                  <td className="mono">{c.telefono}</td>
                  <td>
                    <Badge value={c.activo ? 'activo' : 'inactivo'} />
                  </td>
                  <td>{c.opt_in ? 'Sí' : 'No'}</td>
                  <td className="muted">{c.etiquetas?.join(', ') || '—'}</td>
                  <td>
                    {c.activo && (
                      <button className="btn btn-sm btn-danger" onClick={() => optOut(c._id)}>
                        Dar de baja
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">
                  Sin clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewClientModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
          }}
        />
      )}

      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            load();
          }}
        />
      )}

      {showPurge && (
        <PurgeModal
          total={data?.total ?? 0}
          onClose={() => setShowPurge(false)}
          onDone={() => {
            setShowPurge(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const FORMAT_LABELS: Record<CsvImportFormat, string> = {
  simple: 'CSV simple (Nombre, Celular, categoria)',
  google: 'CSV de Google Contacts',
};

function ImportCsvModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [defaultCc, setDefaultCc] = useState('57');
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [descartados, setDescartados] = useState(0);
  const [format, setFormat] = useState<CsvImportFormat | null>(null);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const {
          contacts: parsed,
          descartados: skip,
          format: detected,
        } = parseContactsCsv(text, defaultCc);
        setContacts(parsed);
        setDescartados(skip);
        setFormat(detected);
        if (!detected) {
          toast.error(
            'Formato no reconocido. Usa columnas Nombre,Celular,categoria o exporta desde Google Contacts.',
          );
        } else if (parsed.length === 0) {
          toast.error('No se encontraron teléfonos válidos en el archivo');
        }
      } catch {
        toast.error('No se pudo leer el archivo CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const importar = async () => {
    if (contacts.length === 0) return;
    setSaving(true);
    try {
      const res = await api<{ insertados: number; actualizados: number; total: number }>(
        '/clients/bulk',
        { method: 'POST', body: { clientes: contacts } },
      );
      toast.success(
        `Importados ${res.total}: ${res.insertados} nuevos, ${res.actualizados} actualizados`,
      );
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Importar contactos (CSV)" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Formatos admitidos: <code>Nombre,Celular,categoria</code> o exportación de Google Contacts.
        La columna <code>categoria</code> se guarda como etiqueta del cliente.
      </p>
      <div className="field">
        <label>Código de país por defecto (para móviles locales)</label>
        <input
          value={defaultCc}
          onChange={(e) => setDefaultCc(e.target.value.replace(/\D/g, ''))}
          placeholder="57"
        />
        <small className="muted">
          Se antepone a los móviles de 10 dígitos que empiezan por 3 y no traen "+".
        </small>
      </div>
      <div className="field">
        <label>Archivo CSV</label>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {fileName && <small className="muted">{fileName}</small>}
      </div>

      {format && (
        <p className="muted">
          Formato detectado: <strong>{FORMAT_LABELS[format]}</strong>
        </p>
      )}

      {contacts.length > 0 && (
        <div className="import-preview">
          <p>
            <strong>{contacts.length}</strong> contactos listos para importar
            {descartados > 0 && <span className="muted"> · {descartados} descartados</span>}
          </p>
          <div className="table-wrap" style={{ maxHeight: 240, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Etiquetas</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 50).map((c) => (
                  <tr key={c.telefono}>
                    <td>{c.nombre}</td>
                    <td className="mono">{c.telefono}</td>
                    <td className="muted">{c.etiquetas.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contacts.length > 50 && (
            <small className="muted">Mostrando los primeros 50 de {contacts.length}.</small>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={importar}
          disabled={saving || contacts.length === 0}
        >
          {saving ? 'Importando…' : `Importar ${contacts.length || ''}`}
        </button>
      </div>
    </Modal>
  );
}

function PurgeModal({
  total,
  onClose,
  onDone,
}: {
  total: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ eliminados: number }>('/clients/purge', {
        method: 'POST',
        body: { password },
      });
      toast.success(`${res.eliminados} contactos eliminados`);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Eliminar TODOS los contactos" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="danger-box">
          Esta acción borra los <strong>{total}</strong> contactos de forma permanente y no se puede
          deshacer. Escribe <code>ELIMINAR</code> y tu contraseña para confirmar.
        </div>
        <div className="field">
          <label>Escribe ELIMINAR para confirmar</label>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="ELIMINAR" />
        </div>
        <div className="field">
          <label>Tu contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            disabled={saving || confirm !== 'ELIMINAR' || !password}
          >
            {saving ? 'Eliminando…' : 'Eliminar todos'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/clients', {
        method: 'POST',
        body: {
          nombre,
          telefono,
          opt_in: optIn,
          etiquetas: etiquetas
            ? etiquetas.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        },
      });
      toast.success('Cliente creado');
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Teléfono (E.164 sin +, solo dígitos)</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="573001234567"
            required
          />
        </div>
        <div className="field">
          <label>Etiquetas (separadas por coma)</label>
          <input
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
            placeholder="cali, premium"
          />
        </div>
        <div className="field row">
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            id="optin"
          />
          <label htmlFor="optin" style={{ margin: 0 }}>
            Tiene consentimiento (opt-in)
          </label>
        </div>
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
