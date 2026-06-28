interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
}

export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  limitOptions = [25, 50, 100],
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);

  return (
    <div className="toolbar pagination">
      <span className="muted">
        {total === 0 ? 'Sin resultados' : `Mostrando ${from}–${to} de ${total}`}
      </span>
      <div className="spacer" />
      {onLimitChange && (
        <>
          <label className="muted" style={{ fontSize: 13 }}>
            Por página
          </label>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Registros por página"
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      )}
      <button
        type="button"
        className="btn btn-sm"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        ← Anterior
      </button>
      <span className="muted" style={{ fontSize: 13 }}>
        Página {safePage} de {pages}
      </span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={safePage >= pages}
        onClick={() => onPageChange(safePage + 1)}
      >
        Siguiente →
      </button>
    </div>
  );
}
