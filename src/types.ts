export type Role = 'admin' | 'operador' | 'agente';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  mfaEnabled?: boolean;
}

export type LoginResponse =
  | {
      requiresMfa: true;
      mfaToken: string;
      user: Pick<User, 'id' | 'nombre' | 'email'>;
    }
  | {
      token: string;
      refreshToken: string;
      user: User;
    };

export interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  available: boolean;
}

export type UserApprovalStatus = 'pendiente' | 'aprobado' | 'rechazado';

/** Usuario del panel (GET /users) — formato API con _id */
export interface AppUser {
  _id: string;
  nombre: string;
  email: string;
  rol: Role;
  activo: boolean;
  estado_aprobacion: UserApprovalStatus;
  ultimo_login: string | null;
  createdAt: string;
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

export interface BotRule {
  _id: string;
  nombre: string;
  palabras_clave: string[];
  respuesta_tipo: 'texto';
  respuesta: string;
  activo: boolean;
  prioridad: number;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  mensaje_cierre: string;
  enviar_mensaje_cierre: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}

export interface PersonaCategoria {
  _id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  activo: boolean;
  orden: number;
}

export interface Persona {
  _id: string;
  nombre: string;
  telefono: string;
  categoria_slug: string;
  activo: boolean;
  notas: string | null;
  metadata: Record<string, unknown>;
  origen: string | null;
}

export interface PersonasConfig {
  default_country_code: string;
  auto_pago_pendiente: boolean;
  categoria_pendientes_slug: string;
  sync_to_clients: boolean;
  updated_at: string;
}

export type PagoEstado = 'pendiente' | 'pagado' | 'cancelado';

export interface Pago {
  _id: string;
  persona_id: string;
  estado: PagoEstado;
  monto: number | null;
  moneda: string;
  concepto: string | null;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  referencia: string | null;
  notas: string | null;
  persona_nombre: string | null;
  persona_telefono: string | null;
  categoria_slug: string | null;
}

export interface PagoResumen {
  pendientes: number;
  pagados: number;
  cancelados: number;
  montoPendiente: number;
  montoPagado: number;
}
