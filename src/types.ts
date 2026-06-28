export type Role = 'admin' | 'operador' | 'agente';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface Client {
  _id: string;
  nombre: string;
  telefono: string;
  activo: boolean;
  opt_in: boolean;
  etiquetas: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TemplateVariable {
  indice: number;
  nombre: string;
  ejemplo?: string;
}

export interface Template {
  _id: string;
  nombre_meta: string;
  idioma: string;
  categoria: 'marketing' | 'utility' | 'authentication';
  estado: 'borrador' | 'pendiente' | 'aprobada' | 'rechazada';
  header_tipo?: 'none' | 'image';
  header_url?: string | null;
  cuerpo: string;
  variables: TemplateVariable[];
}

export interface CampaignMetrics {
  total: number;
  encolados: number;
  enviados: number;
  entregados: number;
  leidos: number;
  fallidos: number;
}

export interface CampaignSettings {
  send_rate_per_second: number;
  release_batch_size: number;
  product_policy: 'CLOUD_API_FALLBACK' | 'STRICT' | null;
  message_activity_sharing: boolean | null;
  updated_at: string;
}

export interface CampaignReport {
  campana: string;
  estado: Campaign['estado'];
  metricas: CampaignMetrics;
  pendientes: number;
  retenidos_meta: number;
  porcentajes: Record<string, number>;
}

export interface Campaign {
  _id: string;
  nombre_campana: string;
  plantilla_id: string;
  segmento: { etiquetas?: string[]; solo_activos?: boolean };
  mapeo_variables: { indice: number; origen: 'campo' | 'fijo' | 'metadata'; valor: string }[];
  estado: 'borrador' | 'en_progreso' | 'pausada' | 'finalizada' | 'error';
  metricas: CampaignMetrics;
  fecha_lanzamiento?: string | null;
  createdAt: string;
}

export interface MessageLog {
  _id: string;
  telefono: string;
  whatsapp_message_id: string | null;
  meta_message_status?: string | null;
  estado_actual: string;
  error?: string | null;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  telefono: string;
  modo: 'bot' | 'humano';
  ventana_abierta_hasta: string | null;
  ultimo_mensaje_entrante: string | null;
  ultima_actividad: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}
