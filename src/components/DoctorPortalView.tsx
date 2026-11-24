import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Dna,
  ExternalLink,
  FileText,
  Lock,
  LogOut,
  MapPin,
  Pill,
  Search,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type {
  AppointmentItem,
  DoctorAlert,
  DoctorProfile,
  DoctorTab,
  MedicationScheduleItem,
  PatientProfile,
  SymptomEntry,
} from '../types/onco';
import { classifyDoseStatus, formatUtcToRome } from '../utils/clinicalLogic';

interface DoctorRosterEntry {
  codice: string;
  nome: string;
  cognome: string;
  avatar: string;
  authorized: boolean;
  authorizedFolder: boolean;
  authorizedDiary: boolean;
  pendingRequest: boolean;
  pendingScope: 'cartella' | 'diario' | 'entrambi' | null;
  profilo: PatientProfile | null;
  symptoms: SymptomEntry[];
  medications: MedicationScheduleItem[];
  appointments: AppointmentItem[];
}

interface DoctorPortalViewProps {
  doctorId: string;
  allDoctors: DoctorProfile[];
  onSwitchRole: () => void;
}

export const DoctorPortalView: React.FC<DoctorPortalViewProps> = ({
  doctorId: initialDoctorId,
  allDoctors,
  onSwitchRole,
}) => {
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [activeTab, setActiveTab] = useState<DoctorTab>('pazienti');
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [patients, setPatients] = useState<DoctorRosterEntry[]>([]);
  const [alerts, setAlerts] = useState<DoctorAlert[]>([]);
  const [selectedPatientCode, setSelectedPatientCode] = useState<string>('PZ001');
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<
    'tutte' | 'alta_emergenza' | 'media' | 'bassa'
  >('tutte');
  const [loading, setLoading] = useState(true);

  // Reply state per alert
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyChannels, setReplyChannels] = useState<
    Record<string, 'OncoCare' | 'WhatsApp' | 'Email' | 'Chiamata'>
  >({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Add Appointment / Medication form for authorized patient
  const [newAptTipo, setNewAptTipo] = useState('');
  const [newAptDate, setNewAptDate] = useState('');
  const [newAptPrep, setNewAptPrep] = useState('');

  const loadWorkspace = useCallback(async () => {
    try {
      const res = await fetch(`/api/doctor/${doctorId}/workspace`);
      const data = await res.json();
      if (res.ok) {
        setDoctor(data.doctor);
        setPatients(data.patients ?? []);
        setAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    setLoading(true);
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.nome} ${p.cognome}`.toLowerCase().includes(q) ||
      p.codice.toLowerCase().includes(q)
    );
  });

  const selectedPatient =
    patients.find((p) => p.codice === selectedPatientCode) ?? patients[0] ?? null;

  const handleRequestConsent = async (
    codice: string,
    ambito: 'cartella' | 'diario' | 'entrambi' = 'entrambi'
  ) => {
    setActionFeedback(null);
    const res = await fetch(`/api/doctor/${doctorId}/request-consent/${codice}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambito }),
    });
    if (res.ok) {
      const label =
        ambito === 'diario'
          ? 'diario dei sintomi'
          : ambito === 'cartella'
            ? 'cartella clinica'
            : 'cartella clinica e diario dei sintomi';
      setActionFeedback(
        `Richiesta di consenso (${label}) inviata al paziente ${codice}. Apparirà nella sua sezione Privacy.`
      );
      await loadWorkspace();
    }
  };

  const handleReplyAlert = async (
    alert: DoctorAlert,
    prefillText?: string,
    markResolved = true
  ) => {
    const textToSend = (prefillText ?? replyDrafts[alert.id] ?? '').trim();
    if (!textToSend) return;
    const channel = replyChannels[alert.id] ?? 'OncoCare';
    const res = await fetch(`/api/doctor/${doctorId}/alerts/${alert.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testo: textToSend,
        canale: channel,
        markResolved,
      }),
    });
    if (res.ok) {
      setReplyDrafts((prev) => ({ ...prev, [alert.id]: '' }));
      setActionFeedback(
        `Risposta inviata al paziente ${alert.paziente_nome} tramite ${channel}.`
      );
      await loadWorkspace();
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newAptTipo.trim() || !newAptDate) return;
    const utcIso = new Date(newAptDate).toISOString();
    const res = await fetch(
      `/api/patients/${selectedPatient.codice}/appointments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: newAptTipo.trim(),
          data_ora: utcIso,
          medico_responsabile: doctor?.nome ?? 'Medico Curante',
          preparazione: newAptPrep.trim() || undefined,
        }),
      }
    );
    if (res.ok) {
      setNewAptTipo('');
      setNewAptDate('');
      setNewAptPrep('');
      setActionFeedback(
        `Nuovo appuntamento aggiunto per ${selectedPatient.nome} ${selectedPatient.cognome}.`
      );
      await loadWorkspace();
    }
  };

  const unreadAlertsCount = alerts.filter((a) => a.stato === 'nuova').length;
  const emergencyAlerts = alerts.filter(
    (a) => a.livello_urgenza === 'emergenza' && a.stato !== 'risolta'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar Professionista Sanitario */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs">
                OC
              </div>
              <span className="font-display text-base font-semibold text-slate-900">
                OncoCare Pro
              </span>
            </div>
          </div>

          {/* Doctor Switcher for Testing Multi-Doctor Consent */}
          <div className="space-y-1.5">
            <label
              htmlFor="doctor-profile-switch"
              className="block text-xs font-medium text-slate-500"
            >
              Professionista attivo
            </label>
            <select
              id="doctor-profile-switch"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {allDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
            {doctor && (
              <p className="text-[11px] text-slate-500">{doctor.specializzazione}</p>
            )}
          </div>

          <nav aria-label="Menu professionista sanitario" className="space-y-1">
            {(
              [
                { id: 'pazienti', label: 'Elenco Pazienti', icon: Users },
                {
                  id: 'notifiche',
                  label: `Notifiche AI (${unreadAlertsCount})`,
                  icon: Bell,
                },
                { id: 'clinica', label: 'Diario & Terapie', icon: FileText },
                { id: 'farmacogenomica', label: 'Farmacogenomica', icon: Dna },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onSwitchRole}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cambia ruolo / Esci</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {activeTab === 'pazienti' && 'Elenco Pazienti e Cartelle Condivise'}
              {activeTab === 'notifiche' && 'Notifiche e Allarmi generati dall’AI'}
              {activeTab === 'clinica' && 'Monitoraggio Diario Sintomi e Terapie'}
              {activeTab === 'farmacogenomica' &&
                'Supporto Farmacogenomico (PharmGKB)'}
            </h1>
          </div>
          {doctor && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
              <span>{doctor.struttura}</span>
            </div>
          )}
        </header>

        <main className="p-6 max-w-6xl space-y-6">
          {/* Active Emergency Alarm Banner */}
          {emergencyAlerts.length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Allarme Emergenza attivo ({emergencyAlerts.length})
                  </p>
                  <p className="text-xs text-red-800 mt-0.5">
                    {emergencyAlerts[0].paziente_nome} ({emergencyAlerts[0].codice_paziente})
                    : {emergencyAlerts[0].titolo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('notifiche')}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Gestisci Emergenza
              </button>
            </div>
          )}

          {actionFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-xs text-emerald-800 underline"
              >
                Chiudi
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Caricamento portale medico...
            </div>
          ) : (
            <>
              {/* TAB 1: ELENCO PAZIENTI */}
              {activeTab === 'pazienti' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Roster List */}
                  <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca paziente o codice (es. PZ001)..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredPatients.map((p) => {
                        const isSelected = selectedPatient?.codice === p.codice;
                        return (
                          <button
                            key={p.codice}
                            type="button"
                            onClick={() => setSelectedPatientCode(p.codice)}
                            className={`w-full py-3 px-2.5 rounded-lg text-left flex items-center justify-between gap-3 transition-colors ${
                              isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.avatar}
                                alt={`${p.nome} ${p.cognome}`}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {p.nome} {p.cognome}
                                </p>
                                <p className="text-xs font-mono text-slate-500 tabular-nums">
                                  {p.codice}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-xs font-medium whitespace-nowrap shrink-0 text-right ${
                                p.authorizedFolder && p.authorizedDiary
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {p.authorizedFolder && p.authorizedDiary
                                ? 'Autorizzato'
                                : p.authorizedFolder
                                  ? 'Cartella OK · Diario no'
                                  : p.authorizedDiary
                                    ? 'Cartella no · Diario OK'
                                    : 'Bloccato (GDPR)'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Patient Folder Detail (Gated by GDPR Consent) */}
                  <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                    {!selectedPatient ? (
                      <p className="text-sm text-slate-500">
                        Seleziona un paziente dall’elenco.
                      </p>
                    ) : !selectedPatient.authorizedFolder || !selectedPatient.profilo ? (
                      <div className="py-10 px-4 text-center space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                          <h2 className="text-lg font-semibold text-slate-900">
                            Accesso alla cartella clinica non autorizzato
                          </h2>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            Il paziente{' '}
                            <strong>
                              {selectedPatient.nome} {selectedPatient.cognome}
                            </strong>{' '}
                            non ha ancora spuntato il consenso alla cartella clinica per{' '}
                            <strong>{doctor?.nome}</strong> (conformità GDPR).
                          </p>
                          {selectedPatient.authorizedDiary && (
                            <p className="text-xs text-emerald-700 font-medium pt-1">
                              Il consenso al Diario Sintomatologico è invece attivo: puoi
                              consultare i sintomi in “Diario &amp; Terapie”.
                            </p>
                          )}
                        </div>

                        {selectedPatient.pendingRequest &&
                        (selectedPatient.pendingScope === 'cartella' ||
                          selectedPatient.pendingScope === 'entrambi') ? (
                          <p className="text-xs font-medium text-amber-800">
                            Richiesta di consenso cartella già inviata · In attesa di
                            conferma del paziente nell’app.
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                void handleRequestConsent(
                                  selectedPatient.codice,
                                  'cartella'
                                )
                              }
                              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Richiedi Consenso Cartella
                            </button>
                            {!selectedPatient.authorizedDiary && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRequestConsent(
                                    selectedPatient.codice,
                                    'entrambi'
                                  )
                                }
                                className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                Richiedi Cartella + Diario
                              </button>
                            )}
                          </div>
                        )}

                        {selectedPatient.authorizedDiary && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('clinica')}
                              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap"
                            >
                              Apri Diario Sintomi Autorizzato
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <p className="text-xs font-medium">
                              <span className="text-emerald-700">
                                Cartella Clinica Autorizzata (GDPR)
                              </span>
                              <span aria-hidden="true" className="text-slate-400">
                                {' · '}
                              </span>
                              <span
                                className={
                                  selectedPatient.authorizedDiary
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }
                              >
                                {selectedPatient.authorizedDiary
                                  ? 'Diario Sintomi Autorizzato'
                                  : 'Diario Sintomi Riservato (GDPR)'}
                              </span>
                            </p>
                            <h2 className="text-xl font-semibold text-slate-900 mt-0.5">
                              {selectedPatient.profilo.nome}{' '}
                              {selectedPatient.profilo.cognome} ·{' '}
                              <span className="font-mono text-base text-slate-500">
                                {selectedPatient.profilo.codice}
                              </span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                              {selectedPatient.profilo.stadio_percorso}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('clinica')}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0"
                          >
                            Apri Diario &amp; Terapie
                          </button>
                        </div>

                        <dl className="divide-y divide-slate-100 text-sm">
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Diagnosi</dt>
                            <dd className="sm:col-span-2 text-slate-900 font-medium">
                              {selectedPatient.profilo.diagnosi}
                            </dd>
                          </div>
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">
                              Terapia attuale
                            </dt>
                            <dd className="sm:col-span-2 text-slate-900">
                              {selectedPatient.profilo.terapia_attuale}
                            </dd>
                          </div>
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">
                              Tossicità attese
                            </dt>
                            <dd className="sm:col-span-2 text-slate-700">
                              {selectedPatient.profilo.tossicita_attese.join(' · ')}
                            </dd>
                          </div>
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Allergie</dt>
                            <dd className="sm:col-span-2 text-red-700 font-medium">
                              {selectedPatient.profilo.allergie.join(' · ')}
                            </dd>
                          </div>
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Note cliniche</dt>
                            <dd className="sm:col-span-2 text-slate-700">
                              {selectedPatient.profilo.note_cliniche}
                            </dd>
                          </div>
                          <div className="py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">
                              Geolocalizzazione
                            </dt>
                            <dd className="sm:col-span-2 text-slate-700 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {selectedPatient.profilo.consenso_geolocalizzazione
                                  ? selectedPatient.profilo.posizione_simulata.indirizzo
                                  : 'Non autorizzata dal paziente'}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 2: NOTIFICHE AI & ALLARMI */}
              {activeTab === 'notifiche' && (() => {
                const highCount = alerts.filter(
                  (a) =>
                    a.livello_urgenza === 'emergenza' ||
                    a.livello_urgenza === 'alta'
                ).length;
                const mediumCount = alerts.filter(
                  (a) => a.livello_urgenza === 'media'
                ).length;
                const lowCount = alerts.filter(
                  (a) => a.livello_urgenza === 'bassa'
                ).length;

                const visibleAlerts = alerts.filter((a) => {
                  if (urgencyFilter === 'alta_emergenza') {
                    return (
                      a.livello_urgenza === 'emergenza' ||
                      a.livello_urgenza === 'alta'
                    );
                  }
                  if (urgencyFilter === 'media') {
                    return a.livello_urgenza === 'media';
                  }
                  if (urgencyFilter === 'bassa') {
                    return a.livello_urgenza === 'bassa';
                  }
                  return true;
                });

                return (
                  <div className="space-y-4">
                    {/* Legenda e filtro urgenza */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700 mr-1">
                          Filtra per urgenza:
                        </span>
                        {(
                          [
                            {
                              id: 'tutte',
                              label: `Tutte (${alerts.length})`,
                              activeCls: 'bg-slate-900 text-white border-slate-900',
                              idleCls: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                            },
                            {
                              id: 'alta_emergenza',
                              label: `Alta / Emergenza (${highCount})`,
                              activeCls: 'bg-red-600 text-white border-red-600',
                              idleCls: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
                            },
                            {
                              id: 'media',
                              label: `Media (${mediumCount})`,
                              activeCls: 'bg-orange-600 text-white border-orange-600',
                              idleCls: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
                            },
                            {
                              id: 'bassa',
                              label: `Bassa (${lowCount})`,
                              activeCls: 'bg-yellow-600 text-white border-yellow-600',
                              idleCls: 'bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100',
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setUrgencyFilter(opt.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                              urgencyFilter === opt.id ? opt.activeCls : opt.idleCls
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {visibleAlerts.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                        Nessuna notifica corrispondente al filtro selezionato.
                      </div>
                    ) : (
                      visibleAlerts.map((alert) => {
                        const isHigh =
                          alert.livello_urgenza === 'emergenza' ||
                          alert.livello_urgenza === 'alta';
                        const isMedium = alert.livello_urgenza === 'media';

                        const cardSurface = isHigh
                          ? 'bg-red-50/90 border-red-300'
                          : isMedium
                            ? 'bg-orange-50/90 border-orange-300'
                            : 'bg-yellow-50/90 border-yellow-300';

                        const headerBorder = isHigh
                          ? 'border-red-200'
                          : isMedium
                            ? 'border-orange-200'
                            : 'border-yellow-200';

                        const urgencyTextCls = isHigh
                          ? 'text-red-800 font-bold'
                          : isMedium
                            ? 'text-orange-800 font-bold'
                            : 'text-yellow-900 font-bold';

                        const urgencyLabel =
                          alert.livello_urgenza === 'emergenza'
                            ? 'EMERGENZA'
                            : alert.livello_urgenza === 'alta'
                              ? 'URGENZA ALTA'
                              : alert.livello_urgenza === 'media'
                                ? 'URGENZA MEDIA'
                                : 'URGENZA BASSA';

                        return (
                          <article
                            key={alert.id}
                            data-urgency={alert.livello_urgenza}
                            className={`border rounded-xl p-5 sm:p-6 space-y-4 ${cardSurface}`}
                          >
                            <div
                              className={`flex flex-wrap items-start justify-between gap-3 pb-3 border-b ${headerBorder}`}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className={`uppercase tracking-wide ${urgencyTextCls}`}>
                                    {urgencyLabel}
                                  </span>
                                  <span aria-hidden="true" className="text-slate-400">
                                    ·
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {alert.paziente_nome} ({alert.codice_paziente})
                                  </span>
                                  <span aria-hidden="true" className="text-slate-400">
                                    ·
                                  </span>
                                  <span className="text-slate-600 tabular-nums">
                                    {formatUtcToRome(alert.creata_il)}
                                  </span>
                                </div>
                                <h2 className="text-base font-semibold text-slate-900 mt-1">
                                  {alert.titolo}
                                </h2>
                              </div>

                              <span
                                className={`text-xs font-semibold ${
                                  alert.stato === 'risolta'
                                    ? 'text-emerald-800'
                                    : isHigh
                                      ? 'text-red-800'
                                      : isMedium
                                        ? 'text-orange-800'
                                        : 'text-yellow-900'
                                }`}
                              >
                                {alert.stato === 'risolta'
                                  ? 'Risolta'
                                  : alert.stato === 'letta'
                                    ? 'Presa in carico'
                                    : 'Da gestire'}
                              </span>
                            </div>

                            <div className="p-3.5 rounded-lg bg-white/85 border border-white/90 space-y-2 text-sm text-slate-800">
                              <p>{alert.motivo}</p>
                              <p className="text-xs text-slate-700">
                                <strong>Azione consigliata:</strong>{' '}
                                {alert.azione_consigliata}
                              </p>
                            </div>

                            {/* Pharmacogenomics Draft Box (if generated by AI) */}
                            {alert.bozza_farmacogenomica && (
                              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                                <p className="text-xs font-semibold text-slate-900">
                                  Bozza di risposta Farmacogenomica / Farmaci (da
                                  confermare)
                                </p>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  {alert.bozza_farmacogenomica.testo}
                                </p>
                                {alert.bozza_farmacogenomica.fonti.length > 0 && (
                                  <div className="flex flex-wrap gap-3 pt-1">
                                    {alert.bozza_farmacogenomica.fonti.map((f) => (
                                      <a
                                        key={f.url}
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-teal-800 hover:underline"
                                      >
                                        <span>{f.titolo}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {!alert.risposta_medico && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleReplyAlert(
                                        alert,
                                        alert.bozza_farmacogenomica?.testo,
                                        true
                                      )
                                    }
                                    className="mt-2 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
                                  >
                                    Approva bozza e invia al paziente
                                  </button>
                                )}
                              </div>
                            )}

                            {alert.risposta_medico ? (
                              <div className="p-3.5 rounded-lg bg-white border border-emerald-300 text-xs text-emerald-950 space-y-1">
                                <p className="font-semibold">
                                  Risposta inviata via {alert.risposta_medico.canale} ·{' '}
                                  {formatUtcToRome(alert.risposta_medico.inviata_il)}
                                </p>
                                <p>{alert.risposta_medico.testo}</p>
                              </div>
                            ) : (
                              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                                <select
                                  aria-label="Canale di risposta"
                                  value={replyChannels[alert.id] ?? 'OncoCare'}
                                  onChange={(e) =>
                                    setReplyChannels((prev) => ({
                                      ...prev,
                                      [alert.id]: e.target.value as
                                        | 'OncoCare'
                                        | 'WhatsApp'
                                        | 'Email'
                                        | 'Chiamata',
                                    }))
                                  }
                                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                                >
                                  <option value="OncoCare">Rispondi su OncoCare</option>
                                  <option value="WhatsApp">Invia su WhatsApp</option>
                                  <option value="Email">Invia via Email</option>
                                  <option value="Chiamata">Registra Chiamata</option>
                                </select>

                                <input
                                  type="text"
                                  value={replyDrafts[alert.id] ?? ''}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [alert.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Scrivi istruzioni o risposta diretta per il paziente..."
                                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />

                                <button
                                  type="button"
                                  onClick={() => void handleReplyAlert(alert)}
                                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Invia risposta</span>
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: DIARIO SINTOMI & TERAPIE DEL PAZIENTE SELEZIONATO */}
              {activeTab === 'clinica' && (
                <div className="space-y-6">
                  {!selectedPatient ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
                      <AlertTriangle className="w-6 h-6 text-amber-700 mx-auto" />
                      <p className="text-sm font-medium text-slate-900">
                        Seleziona un paziente dall’Elenco Pazienti.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
                        <h2 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
                          Diario Sintomatologico · {selectedPatient.nome}{' '}
                          {selectedPatient.cognome}
                        </h2>
                        {!selectedPatient.authorizedDiary ? (
                          <div className="py-8 px-3 text-center space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">
                                Diario sintomatologico non autorizzato
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                                Il paziente non ha concesso a{' '}
                                <strong>{doctor?.nome}</strong> il consenso esplicito
                                alla lettura del diario dei sintomi (GDPR).
                              </p>
                            </div>
                            {selectedPatient.pendingRequest &&
                            (selectedPatient.pendingScope === 'diario' ||
                              selectedPatient.pendingScope === 'entrambi') ? (
                              <p className="text-xs font-medium text-amber-800">
                                Richiesta di accesso al diario già inviata · In attesa di
                                conferma.
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRequestConsent(
                                    selectedPatient.codice,
                                    'diario'
                                  )
                                }
                                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                              >
                                Richiedi Consenso Diario al Paziente
                              </button>
                            )}
                          </div>
                        ) : selectedPatient.symptoms.length === 0 ? (
                          <p className="py-6 text-xs text-slate-500">
                            Nessun sintomo registrato finora nel diario di questo
                            paziente.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-100 mt-2">
                            {selectedPatient.symptoms.map((s) => (
                              <div key={s.id} className="py-3 space-y-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {s.sintomo}
                                  </span>
                                  <span
                                    className={`font-mono text-xs font-semibold tabular-nums ${
                                      s.intensita >= 7
                                        ? 'text-red-700'
                                        : s.intensita >= 4
                                          ? 'text-amber-700'
                                          : 'text-emerald-700'
                                    }`}
                                  >
                                    {s.intensita >= 0 ? `${s.intensita}/10` : 'n.d.'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 tabular-nums">
                                  {s.categoria} · {formatUtcToRome(s.data_ora)}
                                </p>
                                <p className="text-xs text-slate-700">{s.descrizione}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      <div className="lg:col-span-6 space-y-6">
                        {!selectedPatient.authorizedFolder ? (
                          <section className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">
                                Terapie e visite protette (GDPR)
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                                Il consenso alla cartella clinica elettronica non è
                                attivo per <strong>{doctor?.nome}</strong>.
                              </p>
                            </div>
                            {selectedPatient.pendingRequest &&
                            (selectedPatient.pendingScope === 'cartella' ||
                              selectedPatient.pendingScope === 'entrambi') ? (
                              <p className="text-xs font-medium text-amber-800">
                                Richiesta di consenso cartella già inviata.
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRequestConsent(
                                    selectedPatient.codice,
                                    'cartella'
                                  )
                                }
                                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                              >
                                Richiedi Consenso Cartella al Paziente
                              </button>
                            )}
                          </section>
                        ) : (
                          <>
                            <section className="bg-white border border-slate-200 rounded-xl p-6">
                              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Pill className="w-4 h-4 text-teal-700" />
                                <h2 className="text-base font-semibold text-slate-900">
                                  Aderenza Terapeutica
                                </h2>
                              </div>
                              <div className="divide-y divide-slate-100 mt-2">
                                {selectedPatient.medications.map((m) => {
                                  const st = classifyDoseStatus(m);
                                  return (
                                    <div
                                      key={m.id}
                                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                                    >
                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {m.farmaco} · {m.dosaggio}
                                        </p>
                                        <p className="text-slate-500 tabular-nums">
                                          {formatUtcToRome(m.orario_previsto)}
                                        </p>
                                      </div>
                                      <span
                                        className={`font-medium ${
                                          st === 'assunta'
                                            ? 'text-emerald-700'
                                            : st === 'da_assumere_ora'
                                              ? 'text-amber-700'
                                              : 'text-slate-500'
                                        }`}
                                      >
                                        {st === 'assunta'
                                          ? 'Assunta'
                                          : st === 'da_assumere_ora'
                                            ? 'In attesa'
                                            : 'Programmata'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </section>

                            <section className="bg-white border border-slate-200 rounded-xl p-6">
                              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <CalendarPlus className="w-4 h-4 text-teal-700" />
                                <h2 className="text-base font-semibold text-slate-900">
                                  Programma Nuova Visita
                                </h2>
                              </div>
                              <form
                                onSubmit={handleCreateAppointment}
                                className="mt-4 space-y-3"
                              >
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Tipo di visita o trattamento
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={newAptTipo}
                                    onChange={(e) => setNewAptTipo(e.target.value)}
                                    placeholder="Es. Controllo emocromo + visita"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Data e ora
                                  </label>
                                  <input
                                    type="datetime-local"
                                    required
                                    value={newAptDate}
                                    onChange={(e) => setNewAptDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Istruzioni di preparazione
                                  </label>
                                  <input
                                    type="text"
                                    value={newAptPrep}
                                    onChange={(e) => setNewAptPrep(e.target.value)}
                                    placeholder="Es. Digiuno 8 ore, portare referti"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                                >
                                  Aggiungi al calendario del paziente
                                </button>
                              </form>
                            </section>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FARMACOGENOMICA (PHARMGKB) */}
              {activeTab === 'farmacogenomica' && (
                <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Profilo Farmacogenetico · PharmGKB
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Analisi delle varianti genetiche per prevedere efficacia
                      terapeutica e rischio di tossicità oncologica.
                    </p>
                  </div>

                  {!selectedPatient ||
                  !selectedPatient.authorizedFolder ||
                  !selectedPatient.profilo ? (
                    <p className="text-sm text-amber-800">
                      Seleziona un paziente con consenso attivo alla cartella clinica
                      per visualizzare i dati farmacogenomici.
                    </p>
                  ) : selectedPatient.profilo.profilo_farmacogenomico.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nessun dato farmacogenomico registrato per questo paziente.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2.5 pr-4 font-medium">Gene / Allele</th>
                            <th className="py-2.5 pr-4 font-medium">Farmaco</th>
                            <th className="py-2.5 pr-4 font-medium">Rischio</th>
                            <th className="py-2.5 pr-4 font-medium">
                              Raccomandazione Clinica
                            </th>
                            <th className="py-2.5 font-medium">Fonte</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPatient.profilo.profilo_farmacogenomico.map(
                            (pgx) => (
                              <tr key={pgx.id}>
                                <td className="py-3 pr-4 font-mono font-semibold text-slate-900">
                                  {pgx.gene} {pgx.allele}
                                  <div className="font-sans font-normal text-slate-500 mt-0.5">
                                    {pgx.fenotipo}
                                  </div>
                                </td>
                                <td className="py-3 pr-4 font-medium text-slate-800">
                                  {pgx.farmaco_correlato}
                                </td>
                                <td className="py-3 pr-4">
                                  <span
                                    className={`font-semibold capitalize ${
                                      pgx.rischio_tossicita === 'elevato'
                                        ? 'text-red-700'
                                        : pgx.rischio_tossicita === 'moderato'
                                          ? 'text-amber-700'
                                          : 'text-emerald-700'
                                    }`}
                                  >
                                    {pgx.rischio_tossicita}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-slate-700 max-w-md leading-relaxed">
                                  {pgx.raccomandazione_pharmgkb}
                                </td>
                                <td className="py-3">
                                  <a
                                    href={pgx.fonte_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-teal-800 hover:underline whitespace-nowrap"
                                  >
                                    <span>PharmGKB</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
