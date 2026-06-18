const COLORS: Record<string, string> = {
  // estados de campaña
  borrador: 'badge-gray',
  en_progreso: 'badge-blue',
  pausada: 'badge-yellow',
  finalizada: 'badge-green',
  error: 'badge-red',
  // estados de mensaje
  encolado: 'badge-gray',
  enviado: 'badge-blue',
  entregado: 'badge-green',
  leido: 'badge-green',
  fallido: 'badge-red',
  // plantillas
  aprobada: 'badge-green',
  pendiente: 'badge-yellow',
  rechazada: 'badge-red',
  // modo conversación
  bot: 'badge-blue',
  humano: 'badge-yellow',
  // booleanos
  activo: 'badge-green',
  inactivo: 'badge-gray',
};

export function Badge({ value }: { value: string }) {
  const cls = COLORS[value] || 'badge-gray';
  return <span className={`badge ${cls}`}>{value.replace('_', ' ')}</span>;
}
