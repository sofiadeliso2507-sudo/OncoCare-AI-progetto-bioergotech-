import {
  createSeedAlerts,
  createSeedAppointments,
  createSeedBookingReminders,
  createSeedDoctors,
  createSeedMedications,
  createSeedMessages,
  createSeedPatients,
  createSeedSymptoms,
} from '../src/data/seedData';
import type {
  AppointmentItem,
  BookingReminderItem,
  DirectMessage,
  DoctorAlert,
  DoctorProfile,
  MedicationScheduleItem,
  PatientProfile,
  SymptomCategory,
  SymptomEntry,
  UrgencyLevel,
} from '../src/types/onco';
import {
  canDoctorAccessClinicalData,
  canDoctorAccessSymptomDiary,
  canMarkDoseAsAssunta,
  evaluateSymptomAlert,
  normalizeIntensity,
} from '../src/utils/clinicalLogic';

export interface ClinicalDatabase {
  doctors: DoctorProfile[];
  patients: PatientProfile[];
  symptoms: SymptomEntry[];
  medications: MedicationScheduleItem[];
  appointments: AppointmentItem[];
  bookingReminders: BookingReminderItem[];
  alerts: DoctorAlert[];
  messages: DirectMessage[];
}

function initDatabase(): ClinicalDatabase {
  return {
    doctors: createSeedDoctors(),
    patients: createSeedPatients(),
    symptoms: createSeedSymptoms(),
    medications: createSeedMedications(),
    appointments: createSeedAppointments(),
    bookingReminders: createSeedBookingReminders(),
    alerts: createSeedAlerts(),
    messages: createSeedMessages(),
  };
}

let db: ClinicalDatabase = initDatabase();

export function resetDemoDatabase(): ClinicalDatabase {
  db = initDatabase();
  return db;
}

export function getDoctors(): DoctorProfile[] {
  return db.doctors;
}

export function getAllPatientsForDoctorList(doctorId: string) {
  return db.patients.map((p) => {
    const authorizedFolder = canDoctorAccessClinicalData(p, doctorId);
    const authorizedDiary = canDoctorAccessSymptomDiary(p, doctorId);
    const pendingReq = p.richieste_consenso_pendenti.find(
      (r) => r.doctorId === doctorId
    );
    // GDPR minimization: when folder is not authorized, do NOT expose clinical diagnosis, therapies, notes, or genetics!
    return {
      codice: p.codice,
      nome: p.nome,
      cognome: p.cognome,
      avatar: p.avatar,
      authorized: authorizedFolder,
      authorizedFolder,
      authorizedDiary,
      pendingRequest: Boolean(pendingReq),
      pendingScope: pendingReq?.ambito ?? null,
      profilo: authorizedFolder ? p : null,
    };
  });
}

export function getPatientByCode(codice: string): PatientProfile | undefined {
  const normalized = codice.trim().toUpperCase();
  return db.patients.find((p) => p.codice.toUpperCase() === normalized);
}

export function upsertPatientProfile(
  codice: string,
  updates: Partial<PatientProfile>
): PatientProfile | null {
  const existing = getPatientByCode(codice);
  if (!existing) return null;

  Object.assign(existing, updates, { codice: existing.codice });
  return existing;
}

export function createCustomPatient(profile: PatientProfile): PatientProfile {
  const existing = getPatientByCode(profile.codice);
  if (existing) {
    Object.assign(existing, profile);
    return existing;
  }
  db.patients.push(profile);
  return profile;
}

export function updatePatientConsents(
  codice: string,
  payload: {
    consenso_dati_clinici?: boolean;
    consenso_diario_sintomi?: boolean;
    consenso_geolocalizzazione?: boolean;
    consensi_medici?: Record<string, boolean>;
    consensi_diario_medici?: Record<string, boolean>;
    approveDoctorId?: string;
    rejectDoctorId?: string;
    ambito?: 'cartella' | 'diario' | 'entrambi';
  }
): PatientProfile | null {
  const patient = getPatientByCode(codice);
  if (!patient) return null;

  if (typeof payload.consenso_dati_clinici === 'boolean') {
    patient.consenso_dati_clinici = payload.consenso_dati_clinici;
  }
  if (typeof payload.consenso_diario_sintomi === 'boolean') {
    patient.consenso_diario_sintomi = payload.consenso_diario_sintomi;
  }
  if (typeof payload.consenso_geolocalizzazione === 'boolean') {
    patient.consenso_geolocalizzazione = payload.consenso_geolocalizzazione;
  }
  if (payload.consensi_medici) {
    patient.consensi_medici = {
      ...patient.consensi_medici,
      ...payload.consensi_medici,
    };
  }
  if (payload.consensi_diario_medici) {
    patient.consensi_diario_medici = {
      ...patient.consensi_diario_medici,
      ...payload.consensi_diario_medici,
    };
  }
  if (payload.approveDoctorId) {
    const pendingReq = patient.richieste_consenso_pendenti.find(
      (r) => r.doctorId === payload.approveDoctorId
    );
    const scope = payload.ambito ?? pendingReq?.ambito ?? 'entrambi';
    if (scope === 'cartella' || scope === 'entrambi') {
      patient.consensi_medici[payload.approveDoctorId] = true;
      patient.consenso_dati_clinici = true;
    }
    if (scope === 'diario' || scope === 'entrambi') {
      patient.consensi_diario_medici[payload.approveDoctorId] = true;
      patient.consenso_diario_sintomi = true;
    }
    patient.richieste_consenso_pendenti = patient.richieste_consenso_pendenti.filter(
      (r) => r.doctorId !== payload.approveDoctorId
    );
  }
  if (payload.rejectDoctorId) {
    const pendingReq = patient.richieste_consenso_pendenti.find(
      (r) => r.doctorId === payload.rejectDoctorId
    );
    const scope = payload.ambito ?? pendingReq?.ambito ?? 'entrambi';
    if (scope === 'cartella' || scope === 'entrambi') {
      patient.consensi_medici[payload.rejectDoctorId] = false;
    }
    if (scope === 'diario' || scope === 'entrambi') {
      patient.consensi_diario_medici[payload.rejectDoctorId] = false;
    }
    patient.richieste_consenso_pendenti = patient.richieste_consenso_pendenti.filter(
      (r) => r.doctorId !== payload.rejectDoctorId
    );
  }

  return patient;
}

export function requestDoctorConsent(
  codice: string,
  doctorId: string,
  ambito: 'cartella' | 'diario' | 'entrambi' = 'entrambi'
): boolean {
  const patient = getPatientByCode(codice);
  const doctor = db.doctors.find((d) => d.id === doctorId);
  if (!patient || !doctor) return false;

  const existing = patient.richieste_consenso_pendenti.find(
    (r) => r.doctorId === doctorId
  );
  if (existing) {
    if (existing.ambito !== ambito) {
      existing.ambito = 'entrambi';
    }
    existing.richiestaIl = new Date().toISOString();
  } else {
    patient.richieste_consenso_pendenti.push({
      doctorId: doctor.id,
      doctorName: doctor.nome,
      ambito,
      richiestaIl: new Date().toISOString(),
    });
  }
  return true;
}

export function getSymptoms(codice: string): SymptomEntry[] {
  const normalized = codice.trim().toUpperCase();
  return db.symptoms
    .filter((s) => s.codice_paziente.toUpperCase() === normalized)
    .sort((a, b) => new Date(b.data_ora).getTime() - new Date(a.data_ora).getTime());
}

export function addSymptom(params: {
  codice_paziente: string;
  categoria: SymptomCategory;
  sintomo: string;
  intensita: number;
  descrizione: string;
  fonte: 'diario' | 'chat_ai';
  skipAutoAlert?: boolean;
}): {
  entry: SymptomEntry;
  autoAlert?: DoctorAlert;
} | null {
  const patient = getPatientByCode(params.codice_paziente);
  if (!patient) return null;

  const history = getSymptoms(patient.codice);
  const entry: SymptomEntry = {
    id: `SYM${Date.now()}${Math.floor(Math.random() * 100)}`,
    codice_paziente: patient.codice,
    data_ora: new Date().toISOString(),
    categoria: params.categoria,
    sintomo: params.sintomo.trim(),
    intensita: normalizeIntensity(params.intensita),
    descrizione: params.descrizione.trim() || 'Nessun dettaglio aggiuntivo indicato.',
    fonte: params.fonte,
  };

  db.symptoms.unshift(entry);

  let autoAlert: DoctorAlert | undefined;
  if (!params.skipAutoAlert) {
    const evalResult = evaluateSymptomAlert(entry, history, patient);
    if (evalResult.requiresDoctorAlert && evalResult.recommendedUrgency) {
      autoAlert = createDoctorAlert({
        codice_paziente: patient.codice,
        livello_urgenza: evalResult.recommendedUrgency,
        titolo: evalResult.isEmergency
          ? `EMERGENZA: ${entry.sintomo}`
          : `Sintomo segnalato: ${entry.sintomo} (${entry.intensita >= 0 ? `${entry.intensita}/10` : 'intensità n.d.'})`,
        motivo: `${evalResult.reasons.join(' ')} Descrizione: ${entry.descrizione}`,
        azione_consigliata: evalResult.isEmergency
          ? 'Contattare immediatamente il paziente e verificare chiamata al 112.'
          : 'Valutare contatto con il paziente e verificare aderenza/tossicità terapeutica.',
        canale_origine: 'diario_automatico',
      }) ?? undefined;
    }
  }

  return { entry, autoAlert };
}

export function getMedications(codice: string): MedicationScheduleItem[] {
  const normalized = codice.trim().toUpperCase();
  return db.medications
    .filter((m) => m.codice_paziente.toUpperCase() === normalized)
    .sort(
      (a, b) =>
        new Date(a.orario_previsto).getTime() - new Date(b.orario_previsto).getTime()
    );
}

export function addMedicationScheduleItem(
  item: Omit<MedicationScheduleItem, 'id'>
): MedicationScheduleItem | null {
  const patient = getPatientByCode(item.codice_paziente);
  if (!patient) return null;
  const created: MedicationScheduleItem = {
    ...item,
    id: `MED${Date.now()}${Math.floor(Math.random() * 100)}`,
    codice_paziente: patient.codice,
  };
  db.medications.push(created);
  return created;
}

export function markDoseAssunta(
  codice_paziente: string,
  doseId: string
): {
  success: boolean;
  dose?: MedicationScheduleItem;
  error?: string;
} {
  const normalized = codice_paziente.trim().toUpperCase();
  const dose = db.medications.find(
    (m) => m.id === doseId && m.codice_paziente.toUpperCase() === normalized
  );
  if (!dose) {
    return { success: false, error: 'Dose non trovata per questo paziente.' };
  }

  const check = canMarkDoseAsAssunta(dose, new Date());
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  dose.stato = 'assunta';
  dose.assunta_il = new Date().toISOString();
  return { success: true, dose };
}

export function getAppointments(codice: string): AppointmentItem[] {
  const normalized = codice.trim().toUpperCase();
  return db.appointments
    .filter((a) => a.codice_paziente.toUpperCase() === normalized)
    .sort((a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime());
}

export function addAppointment(
  item: Omit<AppointmentItem, 'id'>
): AppointmentItem | null {
  const patient = getPatientByCode(item.codice_paziente);
  if (!patient) return null;
  const created: AppointmentItem = {
    ...item,
    id: `APT${Date.now()}${Math.floor(Math.random() * 100)}`,
    codice_paziente: patient.codice,
  };
  db.appointments.push(created);
  return created;
}

export function getBookingReminders(codice: string): BookingReminderItem[] {
  const normalized = codice.trim().toUpperCase();
  return db.bookingReminders
    .filter((r) => r.codice_paziente.toUpperCase() === normalized)
    .sort((a, b) => {
      if (a.stato !== b.stato) {
        return a.stato === 'da_prenotare' ? -1 : 1;
      }
      return (
        new Date(a.scadenza_consigliata).getTime() -
        new Date(b.scadenza_consigliata).getTime()
      );
    });
}

export function addBookingReminder(
  item: Omit<BookingReminderItem, 'id' | 'stato'>
): BookingReminderItem | null {
  const patient = getPatientByCode(item.codice_paziente);
  if (!patient) return null;
  const created: BookingReminderItem = {
    ...item,
    id: `REM${Date.now()}${Math.floor(Math.random() * 100)}`,
    codice_paziente: patient.codice,
    stato: 'da_prenotare',
  };
  db.bookingReminders.push(created);
  return created;
}

export function bookAppointment(params: {
  codice_paziente: string;
  reminderId?: string;
  data_ora: string;
  durata_minuti?: number;
  tipo: string;
  medico_responsabile: string;
  struttura: string;
  indirizzo_struttura?: string;
  telefono_struttura?: string;
  indicazioni_accesso?: string;
  trattamento_previsto?: string;
  preparazione?: string;
  cosa_portare?: string[];
}): {
  appointment: AppointmentItem;
  reminder?: BookingReminderItem;
} | null {
  const patient = getPatientByCode(params.codice_paziente);
  if (!patient) return null;

  const appointment = addAppointment({
    codice_paziente: patient.codice,
    data_ora: params.data_ora,
    durata_minuti: params.durata_minuti ?? 40,
    tipo: params.tipo.trim(),
    medico_responsabile: params.medico_responsabile.trim() || patient.medico_curante,
    struttura: params.struttura.trim() || patient.struttura_riferimento,
    indirizzo_struttura: params.indirizzo_struttura?.trim() || undefined,
    telefono_struttura:
      params.telefono_struttura?.trim() || patient.telefono_struttura,
    indicazioni_accesso: params.indicazioni_accesso?.trim() || undefined,
    trattamento_previsto:
      params.trattamento_previsto?.trim() || 'Visita prenotata dal paziente tramite promemoria',
    preparazione: params.preparazione?.trim() || undefined,
    cosa_portare:
      Array.isArray(params.cosa_portare) && params.cosa_portare.length > 0
        ? params.cosa_portare
        : ['Tessera sanitaria', 'Impegnativa medica / esenzione 048'],
  });

  if (!appointment) return null;

  let reminder: BookingReminderItem | undefined;
  if (params.reminderId) {
    reminder = db.bookingReminders.find(
      (r) =>
        r.id === params.reminderId &&
        r.codice_paziente.toUpperCase() === patient.codice.toUpperCase()
    );
    if (reminder) {
      reminder.stato = 'prenotata';
      reminder.appointment_id = appointment.id;
    }
  }

  return { appointment, reminder };
}

export function getAlertsForDoctor(doctorId?: string): DoctorAlert[] {
  return db.alerts
    .filter((a) => !doctorId || a.doctor_id === doctorId)
    .sort((a, b) => new Date(b.creata_il).getTime() - new Date(a.creata_il).getTime());
}

export function createDoctorAlert(params: {
  codice_paziente: string;
  livello_urgenza: UrgencyLevel;
  titolo?: string;
  motivo: string;
  azione_consigliata: string;
  bozza_farmacogenomica?: {
    testo: string;
    fonti: { titolo: string; url: string }[];
  };
  canale_origine: 'chat_ai' | 'emergenza_pulsante' | 'diario_automatico';
}): DoctorAlert | null {
  const patient = getPatientByCode(params.codice_paziente);
  if (!patient) return null;

  const alert: DoctorAlert = {
    id: `ALT${Date.now()}${Math.floor(Math.random() * 100)}`,
    codice_paziente: patient.codice,
    paziente_nome: `${patient.nome} ${patient.cognome}`,
    doctor_id: patient.medico_curante_id,
    creata_il: new Date().toISOString(),
    livello_urgenza: params.livello_urgenza,
    titolo:
      params.titolo ??
      (params.livello_urgenza === 'emergenza'
        ? 'Allarme Emergenza Paziente'
        : 'Segnalazione OncoCare AI'),
    motivo: params.motivo.trim(),
    azione_consigliata: params.azione_consigliata.trim(),
    bozza_farmacogenomica: params.bozza_farmacogenomica,
    stato: 'nuova',
    canale_origine: params.canale_origine,
  };

  db.alerts.unshift(alert);
  return alert;
}

export function respondToAlert(params: {
  alertId: string;
  doctorName: string;
  testo: string;
  canale: 'OncoCare' | 'WhatsApp' | 'Email' | 'Chiamata';
  markResolved?: boolean;
}): DoctorAlert | null {
  const alert = db.alerts.find((a) => a.id === params.alertId);
  if (!alert) return null;

  const now = new Date().toISOString();
  alert.risposta_medico = {
    testo: params.testo.trim(),
    canale: params.canale,
    inviata_il: now,
  };
  alert.stato = params.markResolved ? 'risolta' : 'letta';

  db.messages.unshift({
    id: `MSG${Date.now()}`,
    codice_paziente: alert.codice_paziente,
    mittente: 'medico',
    nome_mittente: params.doctorName,
    testo: params.testo.trim(),
    canale: params.canale === 'Chiamata' ? 'OncoCare' : params.canale,
    data_ora: now,
  });

  return alert;
}

export function getMessagesForPatient(codice: string): DirectMessage[] {
  const normalized = codice.trim().toUpperCase();
  return db.messages
    .filter((m) => m.codice_paziente.toUpperCase() === normalized)
    .sort((a, b) => new Date(b.data_ora).getTime() - new Date(a.data_ora).getTime());
}
