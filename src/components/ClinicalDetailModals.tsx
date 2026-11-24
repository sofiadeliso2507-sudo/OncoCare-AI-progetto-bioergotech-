import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Pill,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AppointmentItem,
  BookingReminderItem,
  DoctorProfile,
  MedicationScheduleItem,
  PatientProfile,
} from '../types/onco';
import {
  classifyDoseStatus,
  formatRomeTimeOnly,
  formatUtcToRome,
  getRomeDateParts,
} from '../utils/clinicalLogic';

/* -------------------------------------------------------------------------- */
/* 1. Medication Leaflet ("Bugiardino") Modal                                 */
/* -------------------------------------------------------------------------- */

interface MedicationLeafletModalProps {
  medication: MedicationScheduleItem | null;
  onClose: () => void;
  onMarkTaken?: (dose: MedicationScheduleItem) => Promise<void>;
  busyId?: string | null;
}

export const MedicationLeafletModal: React.FC<MedicationLeafletModalProps> = ({
  medication,
  onClose,
  onMarkTaken,
  busyId,
}) => {
  if (!medication) return null;

  const status = classifyDoseStatus(medication, new Date());
  const romeTime = formatRomeTimeOnly(medication.orario_previsto);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="med-leaflet-title"
      data-testid="medication-leaflet-modal"
      className="fixed inset-0 z-[60] bg-slate-950/55 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[82vh] sm:max-h-[86vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Foglietto Illustrativo &amp; Scheda Terapeutica
              </p>
              <h2
                id="med-leaflet-title"
                className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5"
              >
                {medication.farmaco} ·{' '}
                <span className="font-mono tabular-nums">{medication.dosaggio}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Principio attivo: {medication.principio_attivo} · Quantità:{' '}
                {medication.quantita}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Chiudi scheda farmaco"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stato dose selezionata */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-900">
              Somministrazione programmata: {formatUtcToRome(medication.orario_previsto)}
            </p>
            <p className="text-slate-600">
              Stato attuale:{' '}
              <span
                className={
                  status === 'assunta'
                    ? 'text-emerald-700 font-semibold'
                    : status === 'da_assumere_ora'
                      ? 'text-teal-700 font-semibold'
                      : 'text-slate-600 font-medium'
                }
              >
                {status === 'assunta'
                  ? 'Già assunta'
                  : status === 'da_assumere_ora'
                    ? 'Da assumere ora'
                    : `Bloccata fino alle ${romeTime}`}
              </span>
            </p>
          </div>
          {onMarkTaken && status === 'da_assumere_ora' && (
            <button
              type="button"
              disabled={busyId === medication.id}
              onClick={async () => {
                await onMarkTaken(medication);
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap"
            >
              {busyId === medication.id ? 'Registrazione...' : 'Segna come Assunta'}
            </button>
          )}
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
              Indicazioni terapeutiche
            </h3>
            <p>
              {medication.indicazioni_terapeutiche ||
                'Farmaco oncologico o di supporto prescritto nell’ambito del piano terapeutico personalizzato.'}
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-700" />
              Posologia e modalità di assunzione
            </h3>
            <p>{medication.istruzioni_assunzione}</p>
          </section>

          <section className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Interazioni farmacologiche e alimenti da evitare
            </h3>
            <p>
              {medication.interazioni ||
                'Informare sempre il medico prima di assumere integratori, fitoterapici o nuovi farmaci.'}
            </p>
          </section>

          {medication.effetti_indesiderati &&
            medication.effetti_indesiderati.length > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                  Possibili effetti indesiderati
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  {medication.effetti_indesiderati.map((eff, idx) => (
                    <li key={idx}>{eff}</li>
                  ))}
                </ul>
              </section>
            )}

          <section className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
              Avvertenze urgenti e controindicazioni
            </h3>
            <p className="text-xs text-red-900">
              {medication.avvertenze_urgenti || medication.controindicazioni}
            </p>
            {medication.avvertenze_urgenti && (
              <p className="text-xs text-red-800">
                <strong>Controindicazioni principali:</strong>{' '}
                {medication.controindicazioni}
              </p>
            )}
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-slate-600" />
                Conservazione
              </p>
              <p className="text-xs text-slate-600">
                {medication.conservazione ||
                  'Conservare nella confezione originale a temperatura ambiente, al riparo da umidità.'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-semibold text-slate-900">
                Reperibilità e ritiro
              </p>
              <p className="text-xs text-slate-600">{medication.reperibilita}</p>
            </div>
          </section>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {medication.fonte_aifa_url ? (
            <a
              href={medication.fonte_aifa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:underline"
            >
              <span>Scheda ufficiale AIFA / EMA</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-slate-500">
              Non modificare mai la dose senza parere medico.
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Chiudi bugiardino
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Appointment Detail Modal (Posto, Dottore, Preparazione, Cosa portare)   */
/* -------------------------------------------------------------------------- */

interface AppointmentDetailModalProps {
  appointment: AppointmentItem | null;
  doctors: DoctorProfile[];
  onClose: () => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  doctors,
  onClose,
}) => {
  if (!appointment) return null;

  const matchedDoctor = doctors.find(
    (d) =>
      d.nome.toLowerCase() === appointment.medico_responsabile.toLowerCase() ||
      appointment.medico_responsabile
        .toLowerCase()
        .includes(d.nome.replace(/^Dr\.?(?:ssa)?\s+/i, '').toLowerCase())
  );

  const phoneToCall =
    appointment.telefono_struttura || matchedDoctor?.telefono || '+39 02 5550 1400';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apt-detail-title"
      data-testid="appointment-detail-modal"
      className="fixed inset-0 z-[60] bg-slate-950/55 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[82vh] sm:max-h-[86vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Dettagli Visita e Istruzioni
              </p>
              <h2
                id="apt-detail-title"
                className="text-lg font-semibold text-slate-900 mt-0.5"
              >
                {appointment.tipo}
              </h2>
              <p className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">
                {formatUtcToRome(appointment.data_ora)} · Durata stimata{' '}
                {appointment.durata_minuti} min
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Chiudi dettagli visita"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Luogo e accesso */}
        <section className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
            Sede e indicazioni di accesso
          </h3>
          <p className="text-sm font-medium text-slate-900">{appointment.struttura}</p>
          {appointment.indirizzo_struttura && (
            <p className="text-slate-600">{appointment.indirizzo_struttura}</p>
          )}
          {appointment.indicazioni_accesso && (
            <p className="text-slate-700">
              <strong>Accesso:</strong> {appointment.indicazioni_accesso}
            </p>
          )}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <a
              href={`tel:${phoneToCall.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 font-mono font-semibold text-teal-800 hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Segreteria / Reparto: {phoneToCall}</span>
            </a>
          </div>
        </section>

        {/* Medico responsabile */}
        <section className="p-4 rounded-lg bg-white border border-slate-200 space-y-1.5 text-xs">
          <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-700 shrink-0" />
            Medico di riferimento
          </h3>
          <p className="text-sm font-semibold text-slate-900">
            {appointment.medico_responsabile}
          </p>
          {matchedDoctor && (
            <p className="text-slate-600">
              {matchedDoctor.specializzazione} · {matchedDoctor.email} ·{' '}
              <span className="font-mono">{matchedDoctor.telefono}</span>
            </p>
          )}
          <p className="text-slate-700 pt-1">
            <strong>Oggetto della visita:</strong> {appointment.trattamento_previsto}
          </p>
        </section>

        {/* Cosa fare prima (Preparazione) */}
        <section className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
          <h3 className="font-semibold text-amber-950 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            Cosa fare prima (Preparazione)
          </h3>
          <p className="text-amber-950 leading-relaxed">
            {appointment.preparazione ||
              'Nessuna preparazione specifica segnalata. Arrivare 15 minuti prima dell’orario previsto.'}
          </p>
        </section>

        {/* Cosa portare */}
        <section className="p-4 rounded-lg bg-teal-50/60 border border-teal-200 space-y-2 text-xs">
          <h3 className="font-semibold text-teal-950 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-teal-800 shrink-0" />
            Cosa portare con sé
          </h3>
          <ul className="space-y-1.5 text-teal-950">
            {(appointment.cosa_portare && appointment.cosa_portare.length > 0
              ? appointment.cosa_portare
              : [
                  'Tessera sanitaria e documento d’identità',
                  'Impegnativa medica / esenzione 048',
                  'Elenco aggiornato dei farmaci ed eventuali esami recenti',
                ]
            ).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Chiudi dettagli
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Guided Booking Assistant Modal ("Aiuto Prenotazione Visita")            */
/* -------------------------------------------------------------------------- */

interface BookingAssistantModalProps {
  isOpen: boolean;
  reminder: BookingReminderItem | null;
  patient: PatientProfile;
  doctors: DoctorProfile[];
  onClose: () => void;
  onBooked: (bookedIso: string) => Promise<void>;
}

export const BookingAssistantModal: React.FC<BookingAssistantModalProps> = ({
  isOpen,
  reminder,
  patient,
  doctors,
  onClose,
  onBooked,
}) => {
  const defaultDateKey = reminder
    ? getRomeDateParts(new Date(reminder.scadenza_consigliata)).dateKey
    : getRomeDateParts(new Date(Date.now() + 7 * 86400 * 1000)).dateKey;

  const [tipo, setTipo] = useState('');
  const [dateStr, setDateStr] = useState(defaultDateKey);
  const [timeStr, setTimeStr] = useState('10:00');
  const [medico, setMedico] = useState(patient.medico_curante);
  const [struttura, setStruttura] = useState(patient.struttura_riferimento);
  const [preparazione, setPreparazione] = useState('');
  const [cosaPortareText, setCosaPortareText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (reminder) {
      const parts = getRomeDateParts(new Date(reminder.scadenza_consigliata));
      setTipo(reminder.titolo);
      setDateStr(parts.dateKey);
      setTimeStr(parts.timeStr || '10:00');
      setMedico(reminder.medico_suggerito || patient.medico_curante);
      setStruttura(reminder.struttura_suggerita || patient.struttura_riferimento);
      setPreparazione(reminder.preparazione_richiesta || '');
      setCosaPortareText((reminder.cosa_portare ?? []).join('\n'));
    } else {
      const nextWeek = getRomeDateParts(
        new Date(Date.now() + 7 * 86400 * 1000)
      ).dateKey;
      setTipo('');
      setDateStr(nextWeek);
      setTimeStr('10:00');
      setMedico(patient.medico_curante);
      setStruttura(patient.struttura_riferimento);
      setPreparazione('Arrivare 15 minuti prima per accettazione.');
      setCosaPortareText(
        'Tessera sanitaria\nImpegnativa medica / Esenzione 048\nReferti esami recenti'
      );
    }
  }, [isOpen, reminder, patient]);

  if (!isOpen) return null;

  const cupPhone = reminder?.telefono_cup || patient.telefono_struttura;
  const addressHint =
    reminder?.indirizzo_struttura || 'Via San Marco 18, 20121 Milano';
  const docsChecklist = reminder?.documenti_richiesti ?? [
    'Impegnativa dematerializzata del medico curante',
    'Codice esenzione 048 (patologia oncologica)',
    'Tessera sanitaria',
  ];

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!tipo.trim() || !dateStr || !timeStr) {
      setErrorMsg('Inserisci il tipo di visita, la data e l’orario confermati.');
      return;
    }

    const combinedLocal = new Date(`${dateStr}T${timeStr}:00`);
    if (Number.isNaN(combinedLocal.getTime())) {
      setErrorMsg('Data o orario non validi.');
      return;
    }

    setSubmitting(true);
    try {
      const cosaPortareList = cosaPortareText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/patients/${patient.codice}/book-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId: reminder?.id,
          tipo: tipo.trim(),
          data_ora: combinedLocal.toISOString(),
          medico_responsabile: medico.trim() || patient.medico_curante,
          struttura: struttura.trim() || patient.struttura_riferimento,
          indirizzo_struttura: addressHint,
          telefono_struttura: cupPhone,
          preparazione: preparazione.trim() || undefined,
          cosa_portare: cosaPortareList,
          trattamento_previsto: reminder
            ? `${reminder.specialita} · Prenotata con assistenza OncoCare`
            : 'Visita specialistica prenotata dal paziente',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Impossibile salvare la prenotazione.');
        return;
      }
      await onBooked(data.appointment?.data_ora ?? combinedLocal.toISOString());
      onClose();
    } catch {
      setErrorMsg('Errore di rete durante il salvataggio in calendario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-assistant-title"
      data-testid="booking-assistant-modal"
      className="fixed inset-0 z-[60] bg-slate-950/55 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[82vh] sm:max-h-[86vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Assistente Prenotazione Visita
              </p>
              <h2
                id="booking-assistant-title"
                className="text-lg font-semibold text-slate-900 mt-0.5"
              >
                {reminder ? reminder.titolo : 'Prenota una nuova visita o esame'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ti guidiamo passo passo nella prenotazione CUP e la salviamo subito nel
                tuo registro.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Chiudi assistente prenotazione"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Passo 1: Guida pratica e numeri utili */}
        <section className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-teal-950">
                Passo 1 · Contatta il CUP o la segreteria del reparto
              </p>
              <p className="text-teal-900 mt-0.5">
                {reminder?.istruzioni_prenotazione ||
                  'Chiama il CUP o la segreteria della struttura di riferimento comunicando il tuo codice esenzione 048.'}
              </p>
            </div>
            <a
              href={`tel:${cupPhone.replace(/\s+/g, '')}`}
              className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Chiama {cupPhone}</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-white border border-teal-100 space-y-1">
              <p className="font-semibold text-slate-900">
                Documenti da tenere davanti al telefono
              </p>
              <ul className="space-y-1 text-slate-700">
                {docsChecklist.map((doc, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-white border border-teal-100 space-y-1">
              <p className="font-semibold text-slate-900">Cosa dire all’operatore</p>
              <p className="text-slate-700 leading-relaxed">
                “Buongiorno, sono {patient.nome} {patient.cognome}, paziente in follow-up
                oncologico con esenzione 048. Devo prenotare{' '}
                <strong>{tipo || 'una visita di controllo'}</strong> presso{' '}
                {struttura}.”
              </p>
            </div>
          </div>
        </section>

        {/* Passo 2: Conferma appuntamento nel registro calendario */}
        <form onSubmit={handleConfirmBooking} className="space-y-4">
          <p className="text-xs font-semibold text-slate-900">
            Passo 2 · Inserisci data e ora confermate per aggiungerle in calendario
          </p>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="book-visit-tipo"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Tipo di visita o esame
              </label>
              <input
                id="book-visit-tipo"
                type="text"
                required
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Es. Ecocardiogramma di controllo semestrale"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="book-visit-date"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Data confermata
              </label>
              <input
                id="book-visit-date"
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="book-visit-time"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ora appuntamento
              </label>
              <input
                id="book-visit-time"
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label
                htmlFor="book-visit-doctor"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Medico / Specialista
              </label>
              <input
                id="book-visit-doctor"
                type="text"
                list="book-doctors-list"
                value={medico}
                onChange={(e) => setMedico(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
              <datalist id="book-doctors-list">
                {doctors.map((d) => (
                  <option key={d.id} value={d.nome} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="book-visit-place"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Struttura / Reparto
              </label>
              <input
                id="book-visit-place"
                type="text"
                value={struttura}
                onChange={(e) => setStruttura(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="book-visit-prep"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Preparazione prima della visita
              </label>
              <input
                id="book-visit-prep"
                type="text"
                value={preparazione}
                onChange={(e) => setPreparazione(e.target.value)}
                placeholder="Es. Digiuno da 8 ore, portare ultimo ECG..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="book-visit-bring"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Cosa portare (una voce per riga)
              </label>
              <textarea
                id="book-visit-bring"
                rows={2}
                value={cosaPortareText}
                onChange={(e) => setCosaPortareText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Salvataggio...'
                  : 'Conferma prenotazione e aggiungi al calendario'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
