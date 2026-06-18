export interface ParsedContact {
  nombre: string;
  telefono: string;
  opt_in: boolean;
  etiquetas: string[];
}

/** Parser CSV que respeta comillas y comas internas (formato Google Contacts). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

/**
 * Normaliza un teléfono a solo dígitos con código de país.
 * - Quita espacios, guiones, paréntesis y el "+".
 * - Si queda un móvil local de 10 dígitos que empieza por "3", antepone el código de país.
 * Devuelve null si no es válido (8–15 dígitos).
 */
export function normalizePhone(raw: string, defaultCc = '57'): string | null {
  if (!raw) return null;
  let d = raw.trim();
  const hadPlus = d.startsWith('+') || d.includes('+');
  d = d.replace(/\D/g, '');
  if (!d) return null;

  // Móvil colombiano local (10 dígitos, empieza por 3) sin código de país.
  if (!hadPlus && d.length === 10 && d.startsWith('3')) {
    d = defaultCc + d;
  }
  // 00 internacional -> quitar prefijo
  if (d.startsWith('00')) d = d.slice(2);

  if (d.length < 8 || d.length > 15) return null;
  return d;
}

function col(header: string[], name: string): number {
  return header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function colAlias(header: string[], aliases: string[]): number {
  const normalized = header.map(normHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normHeader(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

export type CsvImportFormat = 'simple' | 'google';

export function detectCsvFormat(csvText: string): CsvImportFormat | null {
  const rows = parseCsv(csvText);
  if (rows.length < 1) return null;
  const header = rows[0];
  const hasGoogle =
    col(header, 'First Name') >= 0 ||
    header.some((h) => /^phone \d+ - value$/i.test(h.trim()));
  if (hasGoogle) return 'google';

  const hasNombre = colAlias(header, ['nombre', 'name']) >= 0;
  const hasCelular = colAlias(header, ['celular', 'telefono', 'tel', 'mobile', 'phone']) >= 0;
  if (hasNombre && hasCelular) return 'simple';

  return null;
}

/** CSV simple: Nombre, Celular, categoria (la categoría se guarda como etiqueta). */
export function parseSimpleContacts(
  csvText: string,
  defaultCc = '57',
): { contacts: ParsedContact[]; descartados: number } {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { contacts: [], descartados: 0 };

  const header = rows[0];
  const iNombre = colAlias(header, ['nombre', 'name']);
  const iCelular = colAlias(header, ['celular', 'telefono', 'tel', 'mobile', 'phone']);
  const iCategoria = colAlias(header, [
    'categoria',
    'category',
    'etiqueta',
    'etiquetas',
    'label',
    'labels',
  ]);

  if (iNombre < 0 || iCelular < 0) {
    return { contacts: [], descartados: 0 };
  }

  const seen = new Set<string>();
  const contacts: ParsedContact[] = [];
  let descartados = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const nombre = (cells[iNombre] || '').trim();
    const rawTel = (cells[iCelular] || '').trim();
    if (!rawTel) {
      descartados++;
      continue;
    }

    const tel = normalizePhone(rawTel, defaultCc);
    if (!tel) {
      descartados++;
      continue;
    }
    if (seen.has(tel)) continue;
    seen.add(tel);

    const etiquetas =
      iCategoria >= 0 && cells[iCategoria]
        ? cells[iCategoria]
            .split(/[,;|]/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    contacts.push({
      nombre: nombre || `Contacto ${tel}`,
      telefono: tel,
      opt_in: true,
      etiquetas,
    });
  }

  return { contacts, descartados };
}

/** Detecta el formato del CSV y lo parsea (simple o Google Contacts). */
export function parseContactsCsv(
  csvText: string,
  defaultCc = '57',
): { contacts: ParsedContact[]; descartados: number; format: CsvImportFormat | null } {
  const format = detectCsvFormat(csvText);
  if (format === 'simple') {
    const result = parseSimpleContacts(csvText, defaultCc);
    return { ...result, format };
  }
  if (format === 'google') {
    const result = parseGoogleContacts(csvText, defaultCc);
    return { ...result, format };
  }
  return { contacts: [], descartados: 0, format: null };
}

/** Convierte el contenido CSV de Google Contacts en clientes listos para /clients/bulk. */
export function parseGoogleContacts(
  csvText: string,
  defaultCc = '57',
): { contacts: ParsedContact[]; descartados: number } {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { contacts: [], descartados: 0 };

  const header = rows[0];
  const iFirst = col(header, 'First Name');
  const iMiddle = col(header, 'Middle Name');
  const iLast = col(header, 'Last Name');
  const iOrg = col(header, 'Organization Name');
  const iLabels = col(header, 'Labels');
  // Soporta hasta varias columnas de teléfono.
  const phoneCols = header
    .map((h, idx) => ({ h: h.trim().toLowerCase(), idx }))
    .filter((x) => /^phone \d+ - value$/.test(x.h))
    .map((x) => x.idx);

  const seen = new Set<string>();
  const contacts: ParsedContact[] = [];
  let descartados = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const nombrePartes = [iFirst, iMiddle, iLast]
      .map((i) => (i >= 0 ? (cells[i] || '').trim() : ''))
      .filter(Boolean);
    let nombre = nombrePartes.join(' ');
    if (!nombre && iOrg >= 0) nombre = (cells[iOrg] || '').trim();

    const etiquetas =
      iLabels >= 0 && cells[iLabels]
        ? cells[iLabels]
            .split(':::')
            .map((s) => s.replace(/\*/g, '').trim())
            .filter(Boolean)
            .map((s) => s.toLowerCase())
        : [];

    for (const pc of phoneCols) {
      const raw = cells[pc];
      if (!raw || !raw.trim()) continue;
      const tel = normalizePhone(raw, defaultCc);
      if (!tel) {
        descartados++;
        continue;
      }
      if (seen.has(tel)) continue;
      seen.add(tel);
      contacts.push({
        nombre: nombre || `Contacto ${tel}`,
        telefono: tel,
        opt_in: true,
        etiquetas,
      });
    }
  }

  return { contacts, descartados };
}
