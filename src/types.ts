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

export interface TemplateButton {
  tipo: 'quick_reply' | 'url' | 'phone';
  texto: string;
  url?: string | null;
  telefono?: string | null;
}

export interface Template {
  _id: string;
  nombre_meta: string;
  idioma: string;
  categoria: 'marketing' | 'utility' | 'authentication';
  estado: 'borrador' | 'pendiente' | 'aprobada' | 'rechazada';
  header_tipo?: 'none' | 'image' | 'text';
  header_url?: string | null;
  header_text?: string | null;
  footer?: string | null;
  botones?: TemplateButton[];
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
  estado_actual: string;
  error?: string | null;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  telefono: string;
  cliente_id?: string;
  cliente_nombre?: string | null;
  modo: 'bot' | 'humano';
  ventana_abierta_hasta: string | null;
  ultimo_mensaje_entrante: string | null;
  ultima_actividad: string;
  espera_respuesta?: boolean;
}

export interface ConversationMessage {
  _id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  origen: 'cliente' | 'bot' | 'agente' | 'sistema';
  texto: string;
  whatsapp_message_id: string | null;
  estado: 'enviado' | 'entregado' | 'leido' | 'fallido' | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}
