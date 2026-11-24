export type UserRole = 'patient' | 'doctor';

export type PatientTab =
  | 'diario'
  | 'farmaci'
  | 'calendario'
  | 'chat'
  | 'privacy'
  | 'profilo';

export type DoctorTab =
  | 'pazienti'
  | 'notifiche'
  | 'clinica'
  | 'farmacogenomica';

export type UrgencyLevel = 'bassa' | 'media' | 'alta' | 'emergenza';

export type SymptomCategory = 'fisico' | 'psicologico';

export type DoseState = 'da_assumere' | 'assunta';

export interface PharmacogenomicVariant {
  id: string;
  gene: string;
  allele: string;
  fenotipo: string;
  farmaco_correlato: string;
  rischio_tossicita: 'basso' | 'moderato' | 'elevato';
  efficacia_prevista: string;
  raccomandazione_pharmgkb: string;
  fonte_url: string;
}

export interface PatientProfile {
  codice: string;
  nome: string;
  cognome: string;
  data_nascita: string;
  avatar: string;
  diagnosi: string;
  stadio_percorso: string;
  terapia_attuale: string;
  tossicita_attese: string[];
  allergie: string[];
  note_cliniche: string;
  medico_curante_id: string;
  medico_curante: string;
  struttura_riferimento: string;
  telefono_struttura: string;
  contatto_emergenza: {
    nome: string;
    relazione: string;
    telefono: string;
  };
  consenso_dati_clinici: boolean;
  consenso_diario_sintomi: boolean;
  consenso_geolocalizzazione: boolean;
  posizione_simulata: {
    citta: string;
    indirizzo: string;
    lat: number;
    lng: number;
  };
  /** Map of doctorId -> boolean explicit patient consent for electronic medical record */
  consensi_medici: Record<string, boolean>;
  /** Map of doctorId -> boolean explicit patient consent for symptom diary */
  consensi_diario_medici: Record<string, boolean>;
  richieste_consenso_pendenti: {
    doctorId: string;
    doctorName: string;
    ambito: 'cartella' | 'diario' | 'entrambi';
    richiestaIl: string;
  }[];
  profilo_farmacogenomico: PharmacogenomicVariant[];
}

export interface DoctorProfile {
  id: string;
  nome: string;
  specializzazione: string;
  struttura: string;
  email: string;
  telefono: string;
  avatar?: string;
}

export interface SymptomEntry {
  id: string;
  codice_paziente: string;
  data_ora: string; // UTC ISO string
  categoria: SymptomCategory;
  sintomo: string;
  intensita: number; // 0-10, or -1 if not indicated
  descrizione: string;
  fonte: 'diario' | 'chat_ai';
}

export interface MedicationScheduleItem {
  id: string;
  codice_paziente: string;
  farmaco: string;
  principio_attivo: string;
  dosaggio: string;
  quantita: string;
  orario_previsto: string; // UTC ISO string
  stato: DoseState;
  assunta_il?: string; // UTC ISO string
  istruzioni_assunzione: string;
  reperibilita: string;
  controindicazioni: string;
  indicazioni_terapeutiche?: string;
  interazioni?: string;
  effetti_indesiderati?: string[];
  avvertenze_urgenti?: string;
  conservazione?: string;
  fonte_aifa_url?: string;
}

export interface AppointmentItem {
  id: string;
  codice_paziente: string;
  data_ora: string; // UTC ISO string
  durata_minuti: number;
  tipo: string;
  medico_responsabile: string;
  struttura: string;
  indirizzo_struttura?: string;
  telefono_struttura?: string;
  indicazioni_accesso?: string;
  trattamento_previsto: string;
  preparazione?: string;
  cosa_portare?: string[];
}

export interface BookingReminderItem {
  id: string;
  codice_paziente: string;
  titolo: string;
  specialita: string;
  scadenza_consigliata: string; // UTC ISO string
  struttura_suggerita: string;
  indirizzo_struttura: string;
  telefono_cup: string;
  medico_suggerito: string;
  documenti_richiesti: string[];
  istruzioni_prenotazione: string;
  preparazione_richiesta: string;
  cosa_portare: string[];
  urgenza: 'ordinaria' | 'prioritaria';
  stato: 'da_prenotare' | 'prenotata';
  appointment_id?: string;
}

export interface DoctorAlert {
  id: string;
  codice_paziente: string;
  paziente_nome: string;
  doctor_id: string;
  creata_il: string; // UTC ISO string
  livello_urgenza: UrgencyLevel;
  titolo: string;
  motivo: string;
  azione_consigliata: string;
  bozza_farmacogenomica?: {
    testo: string;
    fonti: { titolo: string; url: string }[];
  };
  stato: 'nuova' | 'letta' | 'risolta';
  canale_origine: 'chat_ai' | 'emergenza_pulsante' | 'diario_automatico';
  risposta_medico?: {
    testo: string;
    canale: 'OncoCare' | 'WhatsApp' | 'Email' | 'Chiamata';
    inviata_il: string;
  };
}

export interface DirectMessage {
  id: string;
  codice_paziente: string;
  mittente: 'medico' | 'sistema';
  nome_mittente: string;
  testo: string;
  canale: 'OncoCare' | 'WhatsApp' | 'Email';
  data_ora: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolActions?: string[];
  sources?: { title: string; uri: string }[];
  error?: boolean;
}
