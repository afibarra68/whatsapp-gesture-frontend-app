import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { AdminMfaCard } from '../components/AdminMfaCard';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { AppUser, Role, UserApprovalStatus } from '../types';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total, incluye usuarios' },
  { value: 'operador', label: 'Operador', desc: 'Clientes, plantillas y campanas' },
  { value: 'agente', label: 'Agente', desc: 'Conversaciones y respuestas' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '?';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

type ApprovalFilter = 'todos' | UserApprovalStatus;

export function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        approvalFilter !== 'todos' ? `?estado_aprobacion=${approvalFilter}` : '';
      setUsers(await api<AppUser[]>(`/users${qs}`));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast, approvalFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (currentUser?.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const toggleActivo = async (u: AppUser) => {
    if (u._id === currentUser?.id && u.activo) {
      toast.error('No puedes desactivar tu propio usuario');
      return;
    }
    try {
      await api(`/users/${u._id}`, {
        method: 'PATCH',
        body: { activo: !u.activo },
      });
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (u: AppUser) => {
    if (u._id === currentUser?.id) {
      toast.error('No puedes eliminar tu propio usuario');
      return;
    }
    if (!confirm(`Eliminar a ${u.nombre} (${u.email})?`)) return;
    try {
      await api(`/users/${u._id}`, { method: 'DELETE' });
      toast.success('Usuario eliminado');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const aprobar = async (u: AppUser) => {
    try {
      await api(`/users/${u._id}/aprobar`, { method: 'POST' });
      toast.success(`${u.nombre} aprobado � ya puede iniciar sesion`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const rechazar = async (u: AppUser) => {
    if (u._id === currentUser?.id) return;
    if (!confirm(`Rechazar la solicitud de ${u.nombre}?`)) return;
    try {
      await api(`/users/${u._id}/rechazar`, { method: 'POST' });
      toast.success('Solicitud rechazada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const pendingCount = users.filter((u) => u.estado_aprobacion === 'pendiente').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p>Cuentas que pueden ingresar al panel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nuevo usuario
        </button>
      </div>

      <AdminMfaCard />

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          Los registros p�blicos quedan <strong>pendientes</strong> hasta que un administrador
          los apruebe. Solo usuarios <strong>aprobados y activos</strong> pueden iniciar sesi�n.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(
          [
            ['todos', 'Todos'],
            ['pendiente', `Pendientes${approvalFilter === 'pendiente' && pendingCount ? ` (${pendingCount})` : ''}`],
            ['aprobado', 'Aprobados'],
            ['rechazado', 'Rechazados'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm${approvalFilter === key ? ' btn-primary' : ''}`}
            onClick={() => setApprovalFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Aprobacion</th>
              <th>Estado</th>
              <th>Ultimo acceso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty">
                  Cargando...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u._id}>
                  <td>
                    {u.nombre}
                    {u._id === currentUser?.id && (
                      <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                        (tu)
                      </span>
                    )}
                  </td>
                  <td className="mono">{u.email}</td>
                  <td>
                    <Badge value={u.rol} />
                  </td>
                  <td>
                    <Badge value={u.estado_aprobacion} />
                  </td>
                  <td>
                    <Badge value={u.activo ? 'activo' : 'inactivo'} />
                  </td>
                  <td className="muted">{fmtDate(u.ultimo_login)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.estado_aprobacion === 'pendiente' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => aprobar(u)}>
                          Aprobar
                        </button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => rechazar(u)}>
                          Rechazar
                        </button>{' '}
                      </>
                    )}
                    <button className="btn btn-sm" onClick={() => setEditUser(u)}>
                      Editar
                    </button>{' '}
                    <button className="btn btn-sm" onClick={() => setPasswordUser(u)}>
                      Clave
                    </button>{' '}
                    <button className="btn btn-sm" onClick={() => toggleActivo(u)}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>{' '}
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={u._id === currentUser?.id}
                      onClick={() => remove(u)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  No hay usuarios. Crea el primero con el boton de arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            load();
          }}
        />
      )}

      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSaved={() => {
            setPasswordUser(null);
            toast.success('Contrasena actualizada');
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Role>('operador');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/users', {
        method: 'POST',
        body: { nombre, email: email.trim().toLowerCase(), password, rol },
      });
      toast.success('Usuario creado');
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contrasena (min. 8 caracteres)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="field">
          <label>Rol</label>
          <select value={rol} onChange={(e) => setRol(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} � {r.desc}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [nombre, setNombre] = useState(user.nombre);
  const [rol, setRol] = useState<Role>(user.rol);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(`/users/${user._id}`, {
        method: 'PATCH',
        body: { nombre, rol },
      });
      toast.success('Usuario actualizado');
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Editar � ${user.email}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Rol</label>
          <select value={rol} onChange={(e) => setRol(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(`/users/${user._id}/password`, {
        method: 'PATCH',
        body: { password },
      });
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Nueva contrase�a � ${user.nombre}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Contrasena nueva (min. 8 caracteres)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Actualizar
          </button>
        </div>
      </form>
    </Modal>
  );
}
