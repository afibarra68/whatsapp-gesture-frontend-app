import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  countCsvDataRows,
  csvHasCategoriaColumn,
  matchImportBundle,
  PERSONAS_IMPORT_BUNDLES,
  type PersonasImportBundle,
} from '../data/personasImportBundles';
import type {
  Paginated,
  Persona,
  PersonaCategoria,
  PersonaImportResult,
  PersonasConfig,
} from '../types';

type PersonaBulkAction = '' | 'activate' | 'deactivate' | 'delete' | 'change_category';

export function Personas() {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [data, setData] = useState<Paginated<Persona> | null>(null);
  const [categorias, setCategorias] = useState<PersonaCategoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<PersonaBulkAction>('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);

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

  useEffect(() => {
    setSelected(new Set());
  }, [categoria, search, page]);

  const catLabel = (slug: string) =>
    categorias.find((c) => c.slug === slug)?.nombre ?? slug;

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

  const remove = async (p: Persona) => {
    if (!confirm(`Eliminar a ${p.nombre} (${p.telefono})? También se eliminarán sus pagos asociados.`)) {
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

  const runBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;

    if (bulkAction === 'delete') {
      if (!confirm(`¿Eliminar ${selected.size} persona(s)? También se eliminarán sus pagos.`)) return;
    }
    if (bulkAction === 'change_category' && !bulkCategory) {
      toast.error('Selecciona una categoría destino');
      return;
    }

    setBulkRunning(true);
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(
        ids.map(async (id) => {
          if (bulkAction === 'delete') {
            await api(`/personas/${id}`, { method: 'DELETE' });
            return;
          }
          const body: Record<string, unknown> = {};
          if (bulkAction === 'activate') body.activo = true;
          if (bulkAction === 'deactivate') body.activo = false;
          if (bulkAction === 'change_category') body.categoria_slug = bulkCategory;
          await api(`/personas/${id}`, { method: 'PATCH', body });
        }),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (fail === 0) toast.success(`Acción aplicada a ${ok} persona(s)`);
      else toast.error(`${ok} correctas, ${fail} con error`);
      setSelected(new Set());
      setBulkAction('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Personas</h1>
          <p>Contactos por categoría con teléfono para campañas y pagos.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setShowImport(true)}>
            Importar CSV
          </button>
          {isAdmin && (
            <button className="btn" onClick={() => setShowConfig(true)}>
              Configuración
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Nueva persona
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="Buscar nombre o teléfono..."
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
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <span className="muted">{data?.total ?? 0} personas</span>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="muted">
            <strong>{selected.size}</strong> seleccionada(s)
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as PersonaBulkAction)}
          >
            <option value="">Acción masiva...</option>
            <option value="activate">Activar</option>
            <option value="deactivate">Desactivar</option>
            <option value="change_category">Cambiar categoría</option>
            <option value="delete">Eliminar</option>
          </select>
          {bulkAction === 'change_category' && (
            <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
              <option value="">Categoría destino...</option>
              {categorias.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
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
                  aria-label="Seleccionar todas en esta página"
                />
              </th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Notas</th>
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
            ) : data && data.items.length > 0 ? (
              data.items.map((p) => (
                <tr key={p._id} className={selected.has(p._id) ? 'row-selected' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p._id)}
                      onChange={() => toggleOne(p._id)}
                      aria-label={`Seleccionar ${p.nombre}`}
                    />
                  </td>
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
                    {p.notas || '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => setEditPersona(p)}>
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
                <td colSpan={7} className="empty">
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

      {editPersona && (
        <PersonaFormModal
          title={`Editar · ${editPersona.nombre}`}
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

      {showImport && (
        <ImportPersonasCsvModal
          categorias={categorias}
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            load();
          }}
        />
      )}

      {showConfig && isAdmin && (
        <PersonasConfigModal
          categorias={categorias}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}

function formatImportResult(res: PersonaImportResult, label?: string): string {
  const parts = [
    `${res.insertados} nuevas`,
    `${res.actualizados} actualizadas`,
    res.descartados > 0 ? `${res.descartados} descartadas` : null,
    res.pagosCreados > 0 ? `${res.pagosCreados} pagos creados` : null,
  ].filter(Boolean);
  const prefix = label ? `${label}: ` : '';
  return `${prefix}${parts.join(', ')} (${res.format})`;
}

function readCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsText(file, 'UTF-8');
  });
}

function ImportPersonasCsvModal({
  categorias,
  onClose,
  onDone,
}: {
  categorias: PersonaCategoria[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const bundleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [categoriaSlug, setCategoriaSlug] = useState(
    categorias.find((c) => c.slug === 'contactos_celular')?.slug ?? categorias[0]?.slug ?? '',
  );
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [activeBundle, setActiveBundle] = useState<PersonasImportBundle | null>(null);
  const [usesFileCategories, setUsesFileCategories] = useState(false);
  const [previewRows, setPreviewRows] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bundleFiles, setBundleFiles] = useState<
    Partial<Record<string, { csvText: string; fileName: string }>>
  >({});

  const applyCsv = (text: string, name: string, bundle?: PersonasImportBundle | null) => {
    setCsvText(text);
    setFileName(name);
    setActiveBundle(bundle ?? matchImportBundle(name) ?? null);
    setUsesFileCategories(csvHasCategoriaColumn(text));
    setPreviewRows(countCsvDataRows(text));
    if (bundle) setCategoriaSlug(bundle.categoriaSlug);
    else {
      const matched = matchImportBundle(name);
      if (matched) setCategoriaSlug(matched.categoriaSlug);
    }
  };

  const storeBundleFile = (bundle: PersonasImportBundle, text: string, name: string) => {
    setBundleFiles((prev) => ({
      ...prev,
      [bundle.id]: { csvText: text, fileName: name },
    }));
    applyCsv(text, name, bundle);
  };

  const onBundleFile = (bundle: PersonasImportBundle) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readCsvFile(file);
      storeBundleFile(bundle, text, file.name);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onVolcadoMultiple = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;

    const updates: Partial<Record<string, { csvText: string; fileName: string }>> = {};
    let lastBundle: PersonasImportBundle | null = null;
    let lastText = '';
    let lastName = '';

    for (const file of Array.from(files)) {
      const bundle = matchImportBundle(file.name);
      if (!bundle) {
        toast.error(`${file.name}: nombre no reconocido (usa 01-amigos-guabinas.csv, etc.)`);
        continue;
      }
      try {
        const text = await readCsvFile(file);
        updates[bundle.id] = { csvText: text, fileName: file.name };
        lastBundle = bundle;
        lastText = text;
        lastName = file.name;
      } catch (err) {
        toast.error((err as Error).message);
      }
    }

    if (Object.keys(updates).length) {
      setBundleFiles((prev) => ({ ...prev, ...updates }));
      if (lastBundle) applyCsv(lastText, lastName, lastBundle);
      toast.success(`${Object.keys(updates).length} archivo(s) del volcado cargados`);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      applyCsv(await readCsvFile(file), file.name);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const importCsv = async (
    text: string,
    defaultCat: string,
    origen: string,
  ): Promise<PersonaImportResult> => {
    return api<PersonaImportResult>('/personas/import-csv', {
      method: 'POST',
      body: {
        csv: text,
        categoria_slug: defaultCat,
        origen,
      },
    });
  };

  const importar = async () => {
    if (!csvText.trim()) return;
    setSaving(true);
    try {
      const res = await importCsv(
        csvText,
        categoriaSlug,
        fileName ? `csv:${fileName}` : 'csv:panel',
      );
      toast.success(formatImportResult(res));
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const importarBundle = async (bundle: PersonasImportBundle) => {
    const loaded = bundleFiles[bundle.id];
    if (!loaded) {
      toast.error(`Sube primero ${bundle.file}`);
      return;
    }
    setSaving(true);
    try {
      const result = await importCsv(
        loaded.csvText,
        bundle.categoriaSlug,
        `bundle:${loaded.fileName}`,
      );
      toast.success(formatImportResult(result, bundle.label));
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const importarVolcadoCompleto = async () => {
    const missing = PERSONAS_IMPORT_BUNDLES.filter((b) => !bundleFiles[b.id]);
    if (missing.length) {
      toast.error(`Faltan archivos por subir: ${missing.map((m) => m.file).join(', ')}`);
      return;
    }
    if (
      !confirm(
        `¿Importar los ${PERSONAS_IMPORT_BUNDLES.length} archivos subidos (~6.158 personas)? ` +
          'Orden: Guabinas → Celular → Nuevos → Pendientes.',
      )
    ) {
      return;
    }
    setSaving(true);
    let insertados = 0;
    let actualizados = 0;
    let pagos = 0;
    try {
      for (const bundle of PERSONAS_IMPORT_BUNDLES) {
        const loaded = bundleFiles[bundle.id]!;
        const result = await importCsv(
          loaded.csvText,
          bundle.categoriaSlug,
          `bundle:${loaded.fileName}`,
        );
        insertados += result.insertados;
        actualizados += result.actualizados;
        pagos += result.pagosCreados;
      }
      toast.success(
        `Volcado completo: ${insertados} nuevas, ${actualizados} actualizadas` +
          (pagos > 0 ? `, ${pagos} pagos creados` : ''),
      );
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const loadedCount = PERSONAS_IMPORT_BUNDLES.filter((b) => bundleFiles[b.id]).length;

  return (
    <Modal title="Importar personas (CSV)" onClose={onClose} wide>
      <p className="muted" style={{ marginTop: 0 }}>
        Sube los CSV desde tu equipo (carpeta <code>pdfexcle/import</code>). Formato:{' '}
        <code>nombre,telefono,categoria</code>. También admite Google Contacts.
      </p>

      <h3 className="section-title">Volcado estándar</h3>
      <p className="muted section-hint">
        Selecciona los archivos normalizados en tu PC. El nombre del archivo identifica cada lote.
      </p>
      <div className="field">
        <label>Subir varios archivos del volcado</label>
        <input type="file" accept=".csv,text/csv" multiple onChange={onVolcadoMultiple} />
        <small className="muted">
          {loadedCount}/{PERSONAS_IMPORT_BUNDLES.length} archivos cargados en esta sesión
        </small>
      </div>

      <div className="import-bundles">
        {PERSONAS_IMPORT_BUNDLES.map((bundle) => {
          const loaded = bundleFiles[bundle.id];
          return (
            <div key={bundle.id} className="import-bundle-card">
              <div className="import-bundle-title">{bundle.label}</div>
              <div className="muted import-bundle-meta">
                {bundle.file}
                <br />~{bundle.rowCount.toLocaleString('es-CO')} filas · {bundle.categoriaSlug}
              </div>
              {loaded ? (
                <div className="muted import-bundle-loaded">
                  ✓ {loaded.fileName} · {countCsvDataRows(loaded.csvText).toLocaleString('es-CO')} filas
                </div>
              ) : (
                <div className="muted import-bundle-loaded">Sin archivo</div>
              )}
              <input
                ref={(el) => {
                  bundleInputRefs.current[bundle.id] = el;
                }}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={onBundleFile(bundle)}
              />
              <div className="import-bundle-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={saving}
                  onClick={() => bundleInputRefs.current[bundle.id]?.click()}
                >
                  Subir CSV
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={saving || !loaded}
                  onClick={() => importarBundle(bundle)}
                >
                  Importar
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="import-bundles-footer">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || loadedCount < PERSONAS_IMPORT_BUNDLES.length}
          onClick={importarVolcadoCompleto}
        >
          {saving
            ? 'Importando volcado...'
            : `Importar volcado completo (${loadedCount}/${PERSONAS_IMPORT_BUNDLES.length})`}
        </button>
      </div>

      <h3 className="section-title">Otro archivo CSV</h3>
      {!usesFileCategories && (
        <div className="field">
          <label>Categoría por defecto (si el CSV no trae columna categoria)</label>
          <select value={categoriaSlug} onChange={(e) => setCategoriaSlug(e.target.value)} required>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {usesFileCategories && (
        <p className="muted field-hint">
          Este archivo incluye columna <code>categoria</code>; se respeta por fila
          {activeBundle ? ` (volcado: ${activeBundle.label})` : ''}.
        </p>
      )}
      <div className="field">
        <label>Archivo CSV</label>
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
        {fileName && <small className="muted">{fileName}</small>}
      </div>

      {previewRows > 0 && (
        <div className="import-preview">
          <p>
            <strong>{previewRows.toLocaleString('es-CO')}</strong> filas listas para importar
          </p>
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={importar}
          disabled={saving || !csvText.trim()}
        >
          {saving ? 'Importando...' : 'Importar archivo en vista previa'}
        </button>
      </div>
    </Modal>
  );
}

function PersonasConfigModal({
  categorias,
  onClose,
}: {
  categorias: PersonaCategoria[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [defaultCountryCode, setDefaultCountryCode] = useState('57');
  const [autoPagoPendiente, setAutoPagoPendiente] = useState(false);
  const [categoriaPendientesSlug, setCategoriaPendientesSlug] = useState('pendientes_por_pagar');
  const [syncToClients, setSyncToClients] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const config = await api<PersonasConfig>('/personas/config');
        setDefaultCountryCode(config.default_country_code);
        setAutoPagoPendiente(config.auto_pago_pendiente);
        setCategoriaPendientesSlug(config.categoria_pendientes_slug);
        setSyncToClients(config.sync_to_clients);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/personas/config', {
        method: 'PATCH',
        body: {
          default_country_code: defaultCountryCode,
          auto_pago_pendiente: autoPagoPendiente,
          categoria_pendientes_slug: categoriaPendientesSlug,
          sync_to_clients: syncToClients,
        },
      });
      toast.success('Configuración guardada');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const syncPagos = async () => {
    setSyncing(true);
    try {
      const res = await api<{ pagos_creados: number }>('/personas/sync-pagos-pendientes', {
        method: 'POST',
      });
      toast.success(`${res.pagos_creados} pago(s) pendiente(s) generados`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal title="Configuración de personas" onClose={onClose}>
      {loading ? (
        <p className="muted">Cargando...</p>
      ) : (
        <form onSubmit={save}>
          <div className="field">
            <label>Código de país por defecto</label>
            <input
              value={defaultCountryCode}
              onChange={(e) => setDefaultCountryCode(e.target.value.replace(/\D/g, ''))}
              placeholder="57"
              required
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={autoPagoPendiente}
                onChange={(e) => setAutoPagoPendiente(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Crear pago pendiente al importar
            </label>
          </div>
          <div className="field">
            <label>Categoría para pagos pendientes</label>
            <select
              value={categoriaPendientesSlug}
              onChange={(e) => setCategoriaPendientesSlug(e.target.value)}
            >
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
                checked={syncToClients}
                onChange={(e) => setSyncToClients(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Sincronizar importación a clientes (campañas)
            </label>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn"
              onClick={syncPagos}
              disabled={syncing}
            >
              {syncing ? 'Generando...' : 'Generar pagos pendientes'}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
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
          <label>Teléfono (solo dígitos, 8-15)</label>
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
          <label>Categoría</label>
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
            placeholder="Información adicional..."
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
