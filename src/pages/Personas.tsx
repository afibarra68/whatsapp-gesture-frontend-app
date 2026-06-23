import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Paginated, Persona, PersonaCategoria } from '../types';

export function Personas() {
  const toast = useToast();
  const [data, setData] = useState<Paginated<Persona> | null>(null);
  const [categorias, setCategorias] = useState<PersonaCategoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, list] = await Promise.all([
        api<PersonaCategoria[]>('/personas/categorias'),
        (async () => {
          const qs = new URLSearchParams();
          if (categoria) qs.set('categoria', categoria);
          if (search) qs.set('search', search);
          qs.set('page', String(page));
          qs.set('limit', '100');
          return api<Paginated<Persona>>(`/personas?${qs.toString()}`);
        })(),
      ]);
      setCategorias(cats);
      setData(list);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [categoria, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const catLabel = (slug: string) =>
    categorias.find((c) => c.slug === slug)?.nombre ?? slug;

  const remove = async (p: Persona) => {
    if (!confirm(`Eliminar a ${p.nombre} (${p.telefono})? Tambien se eliminaran sus pagos asociados.`)) {
      return;
    }
    try {
      await api(`/personas/${p._id}`, { method: 'DELETE' });
      toast.success('Persona eliminada');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          <p>Contactos por categoria con telefono para campanas y pagos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Nueva persona
        </button>
      </div>

      <div className="toolbar">
        <input
          placeholder="Buscar nombre o telefono..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las categorias</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <span className="muted">{data?.total ?? 0} personas</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Categoria</th>
              <th>Estado</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Cargando...
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <tr key={p._id}>
                  <td>{p.nombre}</td>
                  <td className="mono">{p.telefono}</td>
                  <td>
                    <Badge value={p.categoria_slug} />
                    <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                      {catLabel(p.categoria_slug)}
                    </span>
                  </td>
                  <td>
                    <Badge value={p.activo ? 'activo' : 'inactivo'} />
                  </td>
                  <td className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.notas || '?'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm" onClick={() => setEditPersona(p)}>
                      Editar
                    </button>{' '}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">
                  Sin personas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (data.pages ?? 1) > 1 && (
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span className="muted">
            Pagina {page} de {data.pages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= (data.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      {editPersona && (
        <PersonaFormModal
          title={`Editar ? ${editPersona.nombre}`}
          persona={editPersona}
          categorias={categorias}
          onClose={() => setEditPersona(null)}
          onSaved={() => {
            setEditPersona(null);
            load();
          }}
        />
      )}

      {showCreate && (
        <PersonaFormModal
          title="Nueva persona"
          categorias={categorias}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function PersonaFormModal({
  title,
  persona,
  categorias,
  onClose,
  onSaved,
}: {
  title: string;
  persona?: Persona;
  categorias: PersonaCategoria[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = Boolean(persona);
  const [nombre, setNombre] = useState(persona?.nombre ?? '');
  const [telefono, setTelefono] = useState(persona?.telefono ?? '');
  const [categoriaSlug, setCategoriaSlug] = useState(
    persona?.categoria_slug ?? categorias[0]?.slug ?? 'contactos_celular',
  );
  const [activo, setActivo] = useState(persona?.activo ?? true);
  const [notas, setNotas] = useState(persona?.notas ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        categoria_slug: categoriaSlug,
        activo,
        notas: notas.trim() || undefined,
      };

      if (isEdit && persona) {
        await api(`/personas/${persona._id}`, { method: 'PATCH', body });
        toast.success('Persona actualizada');
      } else {
        await api('/personas', { method: 'POST', body });
        toast.success('Persona creada');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Telefono (solo digitos, 8-15)</label>
          <input
            className="mono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
            minLength={8}
            maxLength={15}
            required
          />
        </div>
        <div className="field">
          <label>Categoria</label>
          <select value={categoriaSlug} onChange={(e) => setCategoriaSlug(e.target.value)} required>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Activo
          </label>
        </div>
        <div className="field">
          <label>Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Informacion adicional..."
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
