/** Metadatos del volcado normalizado en pdfexcle/import (subida manual desde el panel). */
export interface PersonasImportBundle {
  id: string;
  file: string;
  label: string;
  categoriaSlug: string;
  rowCount: number;
  source: string;
}

export const PERSONAS_IMPORT_BUNDLES: PersonasImportBundle[] = [
  {
    id: 'amigos-guabinas',
    file: '01-amigos-guabinas.csv',
    label: 'Amigos Guabinas',
    categoriaSlug: 'amigos_guabinas',
    rowCount: 156,
    source: 'DATOS API - AMIGOS GUABINAS.csv',
  },
  {
    id: 'contactos-celular',
    file: '02-contactos-celular.csv',
    label: 'Contactos celular',
    categoriaSlug: 'contactos_celular',
    rowCount: 4767,
    source: 'DATOS API - CONTACTOS CELULAR.csv',
  },
  {
    id: 'nuevos',
    file: '03-nuevos.csv',
    label: 'Nuevos',
    categoriaSlug: 'nuevos',
    rowCount: 749,
    source: 'DATOS API - NUEVOS.csv',
  },
  {
    id: 'pendientes-por-pagar',
    file: '04-pendientes-por-pagar.csv',
    label: 'Pendientes por pagar',
    categoriaSlug: 'pendientes_por_pagar',
    rowCount: 486,
    source: 'DATOS API - PENDIENTES POR PAGAR.csv',
  },
];

export function matchImportBundle(fileName: string): PersonasImportBundle | undefined {
  const base = fileName.split(/[/\\]/).pop()?.toLowerCase() ?? '';
  return PERSONAS_IMPORT_BUNDLES.find((b) => b.file.toLowerCase() === base);
}

export function csvHasCategoriaColumn(csvText: string): boolean {
  const firstLine = csvText.split(/\r?\n/).find((l) => l.trim());
  if (!firstLine) return false;
  const norm = firstLine
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return norm.split(',').some((c) => c === 'categoria' || c === 'category');
}

export function countCsvDataRows(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  return Math.max(0, lines.length - 1);
}
