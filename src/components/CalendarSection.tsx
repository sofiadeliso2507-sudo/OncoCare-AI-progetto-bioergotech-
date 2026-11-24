import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Phone,
  Pill,
  Plus,
  Stethoscope,
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
import {
  AppointmentDetailModal,
  BookingAssistantModal,
  MedicationLeafletModal,
} from './ClinicalDetailModals';

interface CalendarSectionProps {
  patient: PatientProfile;
  doctors: DoctorProfile[];
  medications: MedicationScheduleItem[];
  appointments: AppointmentItem[];
  bookingReminders: BookingReminderItem[];
  onCalendarUpdated: () => Promise<void>;
}

type CalendarViewMode = 'giorno' | 'settimana' | 'mese';

const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function dateToRomeKey(d: Date): string {
  return getRomeDateParts(d).dateKey;
}

function addDaysToKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function getMondayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysToKey(dateKey, diff);
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  patient,
  doctors,
  medications,
  appointments,
  bookingReminders,
  onCalendarUpdated,
}) => {
  const todayKey = useMemo(() => dateToRomeKey(new Date()), []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('settimana');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Interactive Detail Modals
  const [selectedMed, setSelectedMed] = useState<MedicationScheduleItem | null>(
    null
  );
  const [selectedVisit, setSelectedVisit] = useState<AppointmentItem | null>(
    null
  );
  const [bookingModal, setBookingModal] = useState<{
    open: boolean;
    reminder: BookingReminderItem | null;
  }>({ open: false, reminder: null });

  // Custom Reminder quick creator
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemSpec, setNewRemSpec] = useState('Oncologia');
  const [newRemDate, setNewRemDate] = useState(addDaysToKey(todayKey, 10));
  const [newRemUrgency, setNewRemUrgency] = useState<'ordinaria' | 'prioritaria'>(
    'ordinaria'
  );
  const [savingRem, setSavingRem] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [selYear, selMonth] = selectedDateKey.split('-').map(Number);

  // Group events by Europe/Rome YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map = new Map<
      string,
      { meds: MedicationScheduleItem[]; visits: AppointmentItem[] }
    >();

    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { meds: [], visits: [] });
      return map.get(key)!;
    };

    for (const m of medications) {
      const key = getRomeDateParts(new Date(m.orario_previsto)).dateKey;
      ensure(key).meds.push(m);
    }
    for (const a of appointments) {
      const key = getRomeDateParts(new Date(a.data_ora)).dateKey;
      ensure(key).visits.push(a);
    }
    return map;
  }, [medications, appointments]);

  const nextAppointment = useMemo(() => {
    const nowMs = Date.now();
    return appointments
      .filter((a) => new Date(a.data_ora).getTime() >= nowMs - 3600 * 1000)
      .sort(
        (a, b) => new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime()
      )[0];
  }, [appointments]);

  const pendingReminders = bookingReminders.filter(
    (r) => r.stato === 'da_prenotare'
  );
  const bookedReminders = bookingReminders.filter((r) => r.stato === 'prenotata');

  const navigateStep = (direction: -1 | 1) => {
    if (viewMode === 'giorno') {
      setSelectedDateKey((k) => addDaysToKey(k, direction));
    } else if (viewMode === 'settimana') {
      setSelectedDateKey((k) => addDaysToKey(k, direction * 7));
    } else {
      const dt = new Date(
        Date.UTC(selYear, selMonth - 1 + direction, 15, 12, 0, 0)
      );
      setSelectedDateKey(dt.toISOString().slice(0, 10));
    }
  };

  const weekDays = useMemo(() => {
    const mon = getMondayKey(selectedDateKey);
    return Array.from({ length: 7 }, (_, i) => addDaysToKey(mon, i));
  }, [selectedDateKey]);

  const monthGridDays = useMemo(() => {
    const firstOfMonth = `${selYear}-${String(selMonth).padStart(2, '0')}-01`;
    const gridStart = getMondayKey(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => addDaysToKey(gridStart, i));
  }, [selYear, selMonth]);

  const selectedEvents = eventsByDay.get(selectedDateKey) ?? {
    meds: [],
    visits: [],
  };

  const handleAddCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim()) return;
    setSavingRem(true);
    try {
      const targetIso = new Date(`${newRemDate}T09:00:00`).toISOString();
      const res = await fetch(`/api/patients/${patient.codice}/booking-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo: newRemTitle.trim(),
          specialita: newRemSpec.trim() || 'Oncologia',
          scadenza_consigliata: targetIso,
          urgenza: newRemUrgency,
        }),
      });
      if (res.ok) {
        setNewRemTitle('');
        setShowReminderForm(false);
        setFeedbackMsg('Promemoria visita aggiunto alla lista delle prenotazioni.');
        await onCalendarUpdated();
      }
    } finally {
      setSavingRem(false);
    }
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline shrink-0"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* PROMEMORIA VISITE DA PRENOTARE + ASSISTENTE PRENOTAZIONE */}
      <section
        data-testid="booking-reminders-section"
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <BellRing className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Promemoria Visite da Prenotare ({pendingReminders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Esami e controlli indicati dal tuo team oncologico. Usa “Prenota
                visita” per ricevere assistenza con numeri CUP, esenzione 048 e
                documenti.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReminderForm((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuovo promemoria</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingModal({ open: true, reminder: null })}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Prenota altra visita</span>
            </button>
          </div>
        </div>

        {showReminderForm && (
          <form
            onSubmit={handleAddCustomReminder}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Esame o visita da ricordare
              </label>
              <input
                type="text"
                required
                value={newRemTitle}
                onChange={(e) => setNewRemTitle(e.target.value)}
                placeholder="Es. Controllo emocromo pre-ciclo"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reparto / Specialità
              </label>
              <input
                type="text"
                value={newRemSpec}
                onChange={(e) => setNewRemSpec(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Entro il
              </label>
              <input
                type="date"
                value={newRemDate}
                onChange={(e) => setNewRemDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
              />
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <select
                aria-label="Priorità promemoria"
                value={newRemUrgency}
                onChange={(e) =>
                  setNewRemUrgency(
                    e.target.value === 'prioritaria' ? 'prioritaria' : 'ordinaria'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="ordinaria">Ordinaria</option>
                <option value="prioritaria">Prioritaria</option>
              </select>
              <button
                type="submit"
                disabled={savingRem}
                className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold whitespace-nowrap"
              >
                {savingRem ? 'Salva...' : 'Salva'}
              </button>
            </div>
          </form>
        )}

        {pendingReminders.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            Tutti i controlli consigliati risultano già prenotati nel tuo calendario.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReminders.map((rem) => {
              const isPriority = rem.urgenza === 'prioritaria';
              return (
                <div
                  key={rem.id}
                  data-testid={`booking-reminder-${rem.id}`}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isPriority
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          isPriority ? 'text-amber-800' : 'text-teal-800'
                        }`}
                      >
                        {isPriority ? 'Prenotazione prioritaria' : 'Da prenotare'} ·{' '}
                        {rem.specialita}
                      </p>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {rem.titolo}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      Entro {getRomeDateParts(new Date(rem.scadenza_consigliata)).dateKey}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Struttura:</strong> {rem.struttura_suggerita}
                    </p>
                    <p>
                      <strong>Documenti:</strong> {rem.documenti_richiesti.join(' · ')}
                    </p>
                    <p className="text-slate-600">{rem.istruzioni_prenotazione}</p>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={`tel:${rem.telefono_cup.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-teal-800 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>CUP {rem.telefono_cup}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setBookingModal({ open: true, reminder: rem })}
                      className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold whitespace-nowrap"
                    >
                      Prenota visita
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bookedReminders.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-emerald-800">
            {bookedReminders.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Prenotato: {b.titolo}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Prossimo Appuntamento evidenziato */}
      {nextAppointment && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-teal-800">
              Prossima visita programmata
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {nextAppointment.tipo}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {formatUtcToRome(nextAppointment.data_ora, now)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{nextAppointment.medico_responsabile}</span>
              <span aria-hidden="true">·</span>
              <span>{nextAppointment.struttura}</span>
            </div>
            {nextAppointment.preparazione && (
              <p className="text-xs text-slate-600 pt-1">
                <strong>Cosa fare prima:</strong> {nextAppointment.preparazione}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedVisit(nextAppointment)}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold whitespace-nowrap"
            >
              Dettagli e cosa portare
            </button>
            <button
              type="button"
              onClick={() => {
                const key = getRomeDateParts(
                  new Date(nextAppointment.data_ora)
                ).dateKey;
                setSelectedDateKey(key);
                setViewMode('giorno');
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 whitespace-nowrap"
            >
              Vedi nel giorno
            </button>
          </div>
        </section>
      )}

      {/* Calendar Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Registro Farmaci e Visite
              </h2>
              <p className="text-xs text-slate-500">
                {MONTH_NAMES[selMonth - 1]} {selYear} · Tocca un farmaco o una visita
                per aprire scheda e istruzioni
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Periodo precedente"
                onClick={() => navigateStep(-1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateKey(todayKey)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap"
              >
                Oggi
              </button>
              <button
                type="button"
                aria-label="Periodo successivo"
                onClick={() => navigateStep(1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Giorno / Settimana / Mese Segmented Control */}
            <div
              role="tablist"
              aria-label="Vista calendario"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(['giorno', 'settimana', 'mese'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vista MESE */}
        {viewMode === 'mese' && (
          <div className="mt-5">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_SHORT.map((wd) => (
                <div
                  key={wd}
                  className="text-center text-xs font-medium text-slate-500 py-1.5"
                >
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {monthGridDays.map((dayKey) => {
                const [, m, d] = dayKey.split('-').map(Number);
                const inCurrentMonth = m === selMonth;
                const isToday = dayKey === todayKey;
                const isSelected = dayKey === selectedDateKey;
                const bucket = eventsByDay.get(dayKey);
                const medsCount = bucket?.meds.length ?? 0;
                const visitsCount = bucket?.visits.length ?? 0;

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDateKey(dayKey)}
                    className={`min-h-[82px] p-2 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/40'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    } ${!inCurrentMonth ? 'opacity-45' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isToday
                            ? 'text-teal-800 underline underline-offset-4'
                            : 'text-slate-800'
                        }`}
                      >
                        {d}
                      </span>
                    </div>
                    <div className="space-y-1 w-full">
                      {visitsCount > 0 && (
                        <div className="text-[11px] font-medium text-teal-900 bg-teal-100/70 rounded px-1.5 py-0.5 truncate">
                          {visitsCount} {visitsCount === 1 ? 'visita' : 'visite'}
                        </div>
                      )}
                      {medsCount > 0 && (
                        <div className="text-[11px] text-slate-700 bg-slate-100 rounded px-1.5 py-0.5 truncate tabular-nums">
                          {medsCount} {medsCount === 1 ? 'dose' : 'dosi'}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Vista SETTIMANA */}
        {viewMode === 'settimana' && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDays.map((dayKey, idx) => {
              const [, m, d] = dayKey.split('-').map(Number);
              const isToday = dayKey === todayKey;
              const isSelected = dayKey === selectedDateKey;
              const bucket = eventsByDay.get(dayKey) ?? { meds: [], visits: [] };

              return (
                <div
                  key={dayKey}
                  className={`rounded-lg border p-3 flex flex-col gap-2.5 ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(dayKey)}
                    className="flex items-center justify-between text-left border-b border-slate-100 pb-2"
                  >
                    <span className="text-xs font-medium text-slate-500">
                      {WEEKDAY_SHORT[idx]}
                    </span>
                    <span
                      className={`text-sm font-mono tabular-nums font-semibold ${
                        isToday ? 'text-teal-800' : 'text-slate-900'
                      }`}
                    >
                      {d}/{String(m).padStart(2, '0')}
                    </span>
                  </button>

                  <div className="space-y-2 text-xs">
                    {bucket.visits.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVisit(v)}
                        className="w-full text-left p-2 rounded bg-teal-50 border border-teal-200 hover:border-teal-700 text-teal-950 transition-colors"
                      >
                        <div className="font-mono tabular-nums font-semibold">
                          {formatRomeTimeOnly(v.data_ora)} · Visita
                        </div>
                        <div className="mt-0.5 font-medium line-clamp-2">
                          {v.tipo}
                        </div>
                      </button>
                    ))}

                    {bucket.meds.map((med) => {
                      const st = classifyDoseStatus(med, now);
                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => setSelectedMed(med)}
                          className="w-full text-left p-2 rounded bg-slate-50 border border-slate-200 hover:border-teal-700 text-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono tabular-nums text-slate-700 shrink-0">
                              {formatRomeTimeOnly(med.orario_previsto)}
                            </span>
                            <span
                              className={`truncate font-medium ${
                                st === 'assunta'
                                  ? 'text-emerald-700'
                                  : st === 'da_assumere_ora'
                                    ? 'text-teal-700'
                                    : 'text-slate-500'
                              }`}
                            >
                              {st === 'assunta'
                                ? 'Assunta'
                                : st === 'da_assumere_ora'
                                  ? 'Ora'
                                  : 'Bloccata'}
                            </span>
                          </div>
                          <div className="mt-0.5 font-medium truncate">
                            {med.farmaco} {med.dosaggio}
                          </div>
                        </button>
                      );
                    })}

                    {bucket.visits.length === 0 && bucket.meds.length === 0 && (
                      <p className="text-slate-400 text-[11px] py-2">
                        Nessun evento
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vista GIORNO / Dettaglio Giorno Selezionato */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            Dettaglio del{' '}
            <span className="font-mono tabular-nums">{selectedDateKey}</span>
            {selectedDateKey === todayKey ? ' (Oggi)' : ''}
          </h3>

          {selectedEvents.visits.length === 0 && selectedEvents.meds.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Nessun farmaco o visita registrata in questa giornata.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedEvents.visits.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => setSelectedVisit(visit)}
                  className="text-left p-4 rounded-lg border border-teal-200 bg-teal-50/40 hover:border-teal-700 hover:bg-teal-50/70 transition-colors space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4" />
                      Visita / Appuntamento
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatRomeTimeOnly(visit.data_ora)} ({visit.durata_minuti}{' '}
                      min)
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {visit.tipo}
                  </h4>
                  <p className="text-xs text-slate-700">
                    {visit.trattamento_previsto}
                  </p>
                  <div className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                    <span>
                      {visit.struttura} · {visit.medico_responsabile}
                    </span>
                  </div>
                  {visit.preparazione && (
                    <p className="text-xs text-slate-700 bg-white/80 border border-teal-100 rounded p-2">
                      <strong>Preparazione:</strong> {visit.preparazione}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-teal-800 pt-0.5">
                    Apri sede, medico, preparazione e cosa portare →
                  </p>
                </button>
              ))}

              {selectedEvents.meds.map((med) => {
                const st = classifyDoseStatus(med, now);
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => setSelectedMed(med)}
                    className="text-left p-4 rounded-lg border border-slate-200 bg-slate-50/60 hover:border-teal-700 hover:bg-teal-50/30 transition-colors space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-teal-700" />
                        Terapia Farmacologica
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatRomeTimeOnly(med.orario_previsto)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {med.farmaco} · {med.dosaggio}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {med.quantita} ·{' '}
                      <span
                        className={
                          st === 'assunta'
                            ? 'text-emerald-700 font-semibold'
                            : st === 'da_assumere_ora'
                              ? 'text-teal-700 font-semibold'
                              : 'text-slate-600'
                        }
                      >
                        {st === 'assunta'
                          ? 'Assunta'
                          : st === 'da_assumere_ora'
                            ? 'Da assumere ora'
                            : 'Programmata (bloccata fino all’orario)'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600">
                      {med.istruzioni_assunzione}
                    </p>
                    <p className="text-xs font-semibold text-teal-800 pt-0.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Apri bugiardino completo →</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <MedicationLeafletModal
        medication={selectedMed}
        onClose={() => setSelectedMed(null)}
      />

      <AppointmentDetailModal
        appointment={selectedVisit}
        doctors={doctors}
        onClose={() => setSelectedVisit(null)}
      />

      <BookingAssistantModal
        isOpen={bookingModal.open}
        reminder={bookingModal.reminder}
        patient={patient}
        doctors={doctors}
        onClose={() => setBookingModal({ open: false, reminder: null })}
        onBooked={async (bookedIso) => {
          await onCalendarUpdated();
          const bookedKey = getRomeDateParts(new Date(bookedIso)).dateKey;
          setSelectedDateKey(bookedKey);
          setViewMode('giorno');
          setFeedbackMsg(
            `Visita confermata e salvata nel calendario per il ${bookedKey}.`
          );
        }}
      />
    </div>
  );
};
