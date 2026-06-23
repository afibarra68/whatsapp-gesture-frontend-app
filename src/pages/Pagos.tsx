import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import type { Paginated, Pago, PagoResumen, PersonaCategoria } from '../types';

export function Pagos() {
  const toast = useToast();
  const [data, setData] = useState<Paginated<Pago> | null>(null);
  const [resumen, setResumen] = useState<PagoResumen | null>(null);
  const [categorias, setCategorias] = useState<PersonaCategoria[]>([]);
  const [estado, setEstado] = useState('pendiente');
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (estado) qs.set('estado', estado);
      if (categoria) qs.set('categoria', categoria);
      if (search) qs.set('search', search);
      qs.set('page', String(page));
      qs.set('limit', '100');

      const [list, sum, cats] = await Promise.all([
        api<Paginated<Pago>>(`/pagos?${qs.toString()}`),
        api<PagoResumen>('/pagos/resumen'),
        api<PersonaCategoria[]>('/personas/categorias'),
      ]);
      setData(list);
      setResumen(sum);
      setCategorias(cats);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [estado, categoria, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const marcarPagado = async (id: string) => {
    try {
      await api(`/pagos/${id}`, {
        method: 'PATCH',
        body: { estado: 'pagado' },
      });
      toast.success('Pago registrado');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Pagos</h1>
          <p>Gestión de personas pendientes por pagar.</p>
        </div>
      </div>

      {resumen && (
        <div className="cards">
          <div className="stat-card">
            <div className="label">Pendientes</div>
            <div className="value">{resumen.pendientes}</div>
            {resumen.montoPendiente > 0 && (
              <div className="muted">{formatMoney(resumen.montoPendiente)}</div>
            )}
          </div>
          <div className="stat-card">
            <div className="label">Pagados</div>
            <div className="value">{resumen.pagados}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cancelados</div>
            <div className="value">{resumen.cancelados}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          placeholder="Buscar nombre, teléfono o referencia"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <span className="muted">{data?.total ?? 0} registros</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Teléfono</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Concepto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty">
                  Cargando?
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <tr key={p._id}>
                  <td>{p.persona_nombre ?? '?'}</td>
                  <td className="mono">{p.persona_telefono ?? '?'}</td>
                  <td className="muted">{p.categoria_slug ?? '?'}</td>
                  <td>
                    <Badge value={p.estado} />
                  </td>
                  <td>{p.monto != null ? formatMoney(p.monto) : '?'}</td>
                  <td className="muted">{p.concepto ?? '?'}</td>
                  <td>
                    {p.estado === 'pendiente' && (
                      <button className="btn btn-sm btn-primary" onClick={() => marcarPagado(p._id)}>
                        Marcar pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  Sin pagos. Importa personas pendientes y usa ?Generar pagos pendientes?.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (data.pages ?? 1) > 1 && (
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ? Anterior
          </button>
          <span className="muted">
            Página {page} de {data.pages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= (data.pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente ?
          </button>
        </div>
      )}
    </div>
  );
}
