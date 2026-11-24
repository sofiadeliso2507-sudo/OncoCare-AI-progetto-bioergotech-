import type {
  MedicationScheduleItem,
  PatientProfile,
  SymptomEntry,
  UrgencyLevel,
} from '../types/onco';

const ROME_TZ = 'Europe/Rome';

const ITALIAN_MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

const ITALIAN_WEEKDAYS = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
];

export interface RomeDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  dateKey: string; // YYYY-MM-DD in Europe/Rome
  timeStr: string; // HH:MM
  dayOfWeek: string; // Italian weekday name
}

export function getRomeDateParts(date: Date = new Date()): RomeDateParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);

  const weekdayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekdayIdx = weekdayIndexMap[map.weekday] ?? 0;

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    timeStr: `${pad(hour)}:${pad(minute)}`,
    dayOfWeek: ITALIAN_WEEKDAYS[weekdayIdx],
  };
}

export function isSameRomeDay(utcIso: string, referenceNow: Date = new Date()): boolean {
  const target = new Date(utcIso);
  if (Number.isNaN(target.getTime())) return false;
  return getRomeDateParts(target).dateKey === getRomeDateParts(referenceNow).dateKey;
}

/**
 * Formats a UTC ISO timestamp in Europe/Rome Italian format.
 * Follows the OncoCare rule: include weekday ONLY if it matches today;
 * for all other dates output e.g. "27 novembre alle 10:30".
 */
export function formatUtcToRome(
  utcIso: string,
  referenceNow: Date = new Date(),
  options: { includeYear?: boolean } = {}
): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;

  const targetParts = getRomeDateParts(date);
  const nowParts = getRomeDateParts(referenceNow);
  const monthName = ITALIAN_MONTHS[targetParts.month - 1];
  const isToday = targetParts.dateKey === nowParts.dateKey;

  const yearSuffix = options.includeYear ? ` ${targetParts.year}` : '';
  if (isToday) {
    return `oggi (${targetParts.dayOfWeek} ${targetParts.day} ${monthName}${yearSuffix}) alle ${targetParts.timeStr}`;
  }
  return `${targetParts.day} ${monthName}${yearSuffix} alle ${targetParts.timeStr}`;
}

export function formatRomeTimeOnly(utcIso: string): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return getRomeDateParts(date).timeStr;
}

export type ClassifiedDoseStatus = 'assunta' | 'da_assumere_ora' | 'bloccata';

/**
 * Strictly classifies a medication dose row using ONLY `stato` and UTC `orario_previsto`
 * compared against current time in Europe/Rome.
 */
export function classifyDoseStatus(
  dose: Pick<MedicationScheduleItem, 'stato' | 'orario_previsto'>,
  referenceNow: Date = new Date()
): ClassifiedDoseStatus {
  if (dose.stato === 'assunta') {
    return 'assunta';
  }
  const scheduled = new Date(dose.orario_previsto);
  if (Number.isNaN(scheduled.getTime())) {
    return 'bloccata';
  }
  if (scheduled.getTime() <= referenceNow.getTime()) {
    return 'da_assumere_ora';
  }
  return 'bloccata';
}

export function canMarkDoseAsAssunta(
  dose: Pick<MedicationScheduleItem, 'stato' | 'orario_previsto'>,
  referenceNow: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (dose.stato === 'assunta') {
    return {
      allowed: false,
      reason: 'Questa dose risulta già assunta. Non riprenderla per evitare rischi di sovradosaggio.',
    };
  }
  const scheduled = new Date(dose.orario_previsto);
  if (Number.isNaN(scheduled.getTime())) {
    return { allowed: false, reason: 'Orario previsto non valido.' };
  }
  if (scheduled.getTime() > referenceNow.getTime()) {
    const romeTime = formatRomeTimeOnly(dose.orario_previsto);
    return {
      allowed: false,
      reason: `La dose è bloccata fino all'orario previsto (${romeTime}).`,
    };
  }
  return { allowed: true };
}

export interface SymptomEvaluationResult {
  requiresDoctorAlert: boolean;
  isEmergency: boolean;
  recommendedUrgency: UrgencyLevel | null;
  reasons: string[];
}

const EMERGENCY_PATTERNS: RegExp[] = [
  /dolore\s+toracic/i,
  /difficolt[àa]\s+respiratori/i,
  /non\s+riesco\s+a\s+respirare/i,
  /perdita\s+di\s+coscienza/i,
  /sveniment/i,
  /confusione\s+improvvisa/i,
  /sanguinamento\s+(importante|abbondante|grave)/i,
  /emorragi/i,
  /gonfiore\s+(del\s+)?(volto|viso|gola|labbra|lingua)/i,
  /reazione\s+allergica/i,
  /suicid/i,
  /autolesion/i,
  /farmi\s+del\s+male/i,
];

/**
 * Evaluates whether a newly logged symptom triggers a doctor notification or 112 emergency.
 */
export function evaluateSymptomAlert(
  entry: Pick<SymptomEntry, 'sintomo' | 'intensita' | 'descrizione' | 'categoria'>,
  previousHistory: SymptomEntry[],
  patient: Pick<PatientProfile, 'terapia_attuale' | 'tossicita_attese' | 'note_cliniche'>
): SymptomEvaluationResult {
  const reasons: string[] = [];
  let isEmergency = false;
  let requiresDoctorAlert = false;
  let recommendedUrgency: UrgencyLevel | null = null;

  const combinedText = `${entry.sintomo} ${entry.descrizione}`.toLowerCase();

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(combinedText)) {
      isEmergency = true;
      requiresDoctorAlert = true;
      recommendedUrgency = 'emergenza';
      reasons.push("Segno d'allarme critico rilevato nel sintomo riferito.");
      break;
    }
  }

  // Fever >= 38°C during chemotherapy
  const feverMatch = combinedText.match(/(?:febbre|temperatura)[^0-9]*([34][0-9](?:[.,][0-9])?)/i);
  if (feverMatch) {
    const temp = Number(feverMatch[1].replace(',', '.'));
    if (!Number.isNaN(temp) && temp >= 38) {
      isEmergency = true;
      requiresDoctorAlert = true;
      recommendedUrgency = 'emergenza';
      reasons.push(`Febbre ≥ 38 °C (${temp} °C) in corso di terapia oncologica.`);
    }
  }

  // High intensity >= 7
  if (entry.intensita >= 7) {
    requiresDoctorAlert = true;
    if (!isEmergency) {
      recommendedUrgency = entry.intensita >= 9 ? 'alta' : 'alta';
    }
    reasons.push(`Intensità elevata segnalata (${entry.intensita}/10).`);
  }

  // Worsening by >= 3 points compared to previous entry of same symptom
  const normalizedSymptom = entry.sintomo.trim().toLowerCase();
  const previousSame = previousHistory
    .filter(
      (item) =>
        item.sintomo.trim().toLowerCase() === normalizedSymptom && item.intensita >= 0
    )
    .sort((a, b) => new Date(b.data_ora).getTime() - new Date(a.data_ora).getTime())[0];

  if (previousSame && entry.intensita >= 0 && entry.intensita - previousSame.intensita >= 3) {
    requiresDoctorAlert = true;
    if (!isEmergency && recommendedUrgency !== 'alta') {
      recommendedUrgency = 'alta';
    }
    reasons.push(
      `Peggioramento di ${entry.intensita - previousSame.intensita} punti rispetto alla rilevazione precedente (${previousSame.intensita}/10 → ${entry.intensita}/10).`
    );
  }

  // Unexpected toxicity check against patient's tossicita_attese
  const expectedList = patient.tossicita_attese.map((t) => t.toLowerCase());
  const isExpected = expectedList.some(
    (expected) =>
      normalizedSymptom.includes(expected) || expected.includes(normalizedSymptom)
  );
  if (!isExpected && normalizedSymptom.length > 0 && entry.categoria === 'fisico') {
    requiresDoctorAlert = true;
    if (!isEmergency && !recommendedUrgency) {
      recommendedUrgency = 'media';
    }
    reasons.push(
      `Sintomo "${entry.sintomo}" non incluso tra le tossicità attese della terapia attuale.`
    );
  }

  // Major psychological distress
  if (entry.categoria === 'psicologico' && entry.intensita >= 7) {
    requiresDoctorAlert = true;
    if (!isEmergency) {
      recommendedUrgency = 'alta';
    }
    reasons.push('Disagio psicologico significativo riportato dal paziente.');
  }

  return {
    requiresDoctorAlert,
    isEmergency,
    recommendedUrgency,
    reasons,
  };
}

/**
 * Enforces GDPR per-doctor clinical folder access control.
 */
export function canDoctorAccessClinicalData(
  patient: Pick<PatientProfile, 'consenso_dati_clinici' | 'consensi_medici'>,
  doctorId: string
): boolean {
  if (!patient.consenso_dati_clinici) return false;
  return patient.consensi_medici[doctorId] === true;
}

/**
 * Enforces GDPR per-doctor symptom diary access control independently from clinical folder consent.
 */
export function canDoctorAccessSymptomDiary(
  patient: Pick<PatientProfile, 'consenso_diario_sintomi' | 'consensi_diario_medici'>,
  doctorId: string
): boolean {
  if (!patient.consenso_diario_sintomi) return false;
  return patient.consensi_diario_medici[doctorId] === true;
}

export function normalizeIntensity(raw: unknown): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return -1;
  if (raw < 0) return -1;
  if (raw > 10) return 10;
  return Math.round(raw);
}
