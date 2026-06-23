import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import type { Paginated, Pago, PagoEstado, PagoResumen, PersonaCategoria } from '../types';

type PagoBulkAction = '' | 'pagado' | 'cancelado' | 'pendiente';

export function Pagos() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [data, setData] = useState<Paginated<Pago> | null>(null);
  const [resumen, setResumen] = useState<PagoResumen | null>(null);
  const [categorias, setCategorias] = useState<PersonaCategoria[]>([]);
  const [estado, setEstado] = useState('pendiente');
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editPago, setEditPago] = useState<Pago | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<PagoBulkAction>('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  useEffect(() => {
    setSelected(new Set());
  }, [estado, categoria, search, page]);

  const visibleIds = data?.items.map((p) => p._id) ?? [];
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

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

  const syncPagos = async () => {
    setSyncing(true);
    try {
      const res = await api<{ pagos_creados: number }>('/personas/sync-pagos-pendientes', {
        method: 'POST',
      });
      toast.success(`${res.pagos_creados} pago(s) pendiente(s) generados`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const runBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    setBulkRunning(true);
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(
        ids.map((id) =>
          api(`/pagos/${id}`, {
            method: 'PATCH',
            body: { estado: bulkAction },
          }),
        ),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (fail === 0) toast.success(`Estado actualizado en ${ok} pago(s)`);
      else toast.error(`${ok} correctos, ${fail} con error`);
      setSelected(new Set());
      setBulkAction('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBulkRunning(false);
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
        {isAdmin && (
          <div className="head-actions">
            <button className="btn btn-primary" onClick={syncPagos} disabled={syncing}>
              {syncing ? 'Generando...' : 'Generar pagos pendientes'}
            </button>
          </div>
        )}
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

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="muted">
            <strong>{selected.size}</strong> seleccionado(s)
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as PagoBulkAction)}
          >
            <option value="">Acción masiva...</option>
            <option value="pagado">Marcar como pagado</option>
            <option value="pendiente">Marcar como pendiente</option>
            <option value="cancelado">Cancelar</option>
          </select>
          <button
            className="btn btn-sm btn-primary"
            disabled={!bulkAction || bulkRunning}
            onClick={runBulkAction}
          >
            {bulkRunning ? 'Aplicando...' : 'Aplicar'}
          </button>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => setSelected(new Set())}>
            Limpiar selección
          </button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Seleccionar todos en esta página"
                />
              </th>
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
                <td colSpan={8} className="empty">
                  Cargando...
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p._id)}
                      onChange={() => toggleOne(p._id)}
                      aria-label={`Seleccionar pago de ${p.persona_nombre ?? p._id}`}
                    />
                  </td>
                  <td>{p.persona_nombre ?? '—'}</td>
                  <td className="mono">{p.persona_telefono ?? '—'}</td>
                  <td className="muted">{p.categoria_slug ?? '—'}</td>
                  <td>
                    <Badge value={p.estado} />
                  </td>
                  <td>{p.monto != null ? formatMoney(p.monto) : '—'}</td>
                  <td className="muted">{p.concepto ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => setEditPago(p)}>
                      Editar
                    </button>{' '}
                    {p.estado === 'pendiente' && (
                      <button className="btn btn-sm" onClick={() => marcarPagado(p._id)}>
                        Marcar pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="empty">
                  Sin pagos. Importa personas pendientes y usa «Generar pagos pendientes».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (data.pages ?? 1) > 1 && (
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="muted">
            Página {page} de {data.pages}
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

      {editPago && (
        <PagoFormModal
          pago={editPago}
          onClose={() => setEditPago(null)}
          onSaved={() => {
            setEditPago(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PagoFormModal({
  pago,
  onClose,
  onSaved,
}: {
  pago: Pago;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [estado, setEstado] = useState<PagoEstado>(pago.estado);
  const [monto, setMonto] = useState(pago.monto != null ? String(pago.monto) : '');
  const [concepto, setConcepto] = useState(pago.concepto ?? '');
  const [referencia, setReferencia] = useState(pago.referencia ?? '');
  const [notas, setNotas] = useState(pago.notas ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    pago.fecha_vencimiento ? pago.fecha_vencimiento.slice(0, 10) : '',
  );
  const [fechaPago, setFechaPago] = useState(
    pago.fecha_pago ? pago.fecha_pago.slice(0, 10) : '',
  );
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        estado,
        concepto: concepto.trim() || null,
        referencia: referencia.trim() || null,
        notas: notas.trim() || null,
        fecha_vencimiento: fechaVencimiento || null,
        fecha_pago: fechaPago || null,
      };
      if (monto.trim()) {
        const n = Number(monto);
        if (!Number.isFinite(n) || n <= 0) {
          toast.error('Monto inválido');
          return;
        }
        body.monto = n;
      } else {
        body.monto = null;
      }

      await api(`/pagos/${pago._id}`, { method: 'PATCH', body });
      toast.success('Pago actualizado');
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Editar pago · ${pago.persona_nombre ?? '—'}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginTop: 0 }}>
          {pago.persona_telefono ?? '—'}
        </p>
        <div className="field">
          <label>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as PagoEstado)}>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="field">
          <label>Monto (COP, opcional)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej. 50000"
          />
        </div>
        <div className="field">
          <label>Concepto</label>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </div>
        <div className="field">
          <label>Referencia</label>
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </div>
        <div className="field">
          <label>Fecha vencimiento</label>
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Fecha pago</label>
          <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
        </div>
        <div className="field">
          <label>Notas</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
