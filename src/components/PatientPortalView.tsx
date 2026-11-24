import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  LogOut,
  MapPin,
  MessageSquareHeart,
  Phone,
  PhoneCall,
  Pill,
  Shield,
  User,
  X,
} from 'lucide-react';
import type {
  AppointmentItem,
  BookingReminderItem,
  DirectMessage,
  DoctorProfile,
  MedicationScheduleItem,
  PatientProfile,
  PatientTab,
  SymptomEntry,
} from '../types/onco';
import { SymptomDiarySection } from './SymptomDiarySection';
import { MedicationsSection } from './MedicationsSection';
import { CalendarSection } from './CalendarSection';
import { OncoChatSection } from './OncoChatSection';
import { PrivacySection } from './PrivacySection';
import { ProfileSection } from './ProfileSection';

interface PatientPortalViewProps {
  initialPatientCode: string;
  allPatientCodes: { codice: string; nome: string; cognome: string }[];
  onSwitchRole: () => void;
  onPatientDirectoryRefresh: () => Promise<void>;
}

const CATEGORY_TABS: {
  id: PatientTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'diario', label: 'Diario dei Sintomi', shortLabel: 'Sintomi', icon: ClipboardList },
  { id: 'farmaci', label: 'Farmaci', shortLabel: 'Farmaci', icon: Pill },
  { id: 'calendario', label: 'Registro Farmaci e Visite', shortLabel: 'Registro', icon: Calendar },
  { id: 'chat', label: 'Onco Chat', shortLabel: 'Chat', icon: MessageSquareHeart },
  { id: 'privacy', label: 'Privacy', shortLabel: 'Privacy', icon: Shield },
  { id: 'profilo', label: 'Profilo', shortLabel: 'Profilo', icon: User },
];

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  initialPatientCode,
  allPatientCodes,
  onSwitchRole,
  onPatientDirectoryRefresh,
}) => {
  const [patientCode, setPatientCode] = useState(initialPatientCode);
  const [activeTab, setActiveTab] = useState<PatientTab>('diario');

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [medications, setMedications] = useState<MedicationScheduleItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [bookingReminders, setBookingReminders] = useState<
    BookingReminderItem[]
  >([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Emergency Modal State ('112' | 'medico' | null)
  const [emergencyModal, setEmergencyModal] = useState<'112' | 'medico' | null>(null);
  const [emergencyNote, setEmergencyNote] = useState('');
  const [emergencySent, setEmergencySent] = useState(false);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  const loadPatientBundle = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientCode}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || 'Impossibile caricare il profilo paziente.');
        return;
      }
      setPatient(data.patient);
      setSymptoms(data.symptoms ?? []);
      setMedications(data.medications ?? []);
      setAppointments(data.appointments ?? []);
      setBookingReminders(data.bookingReminders ?? []);
      setMessages(data.messages ?? []);
      setDoctors(data.doctors ?? []);
      setLoadError(null);
    } catch {
      setLoadError('Errore di connessione con il server OncoCare AI.');
    } finally {
      setLoading(false);
    }
  }, [patientCode]);

  useEffect(() => {
    setLoading(true);
    void loadPatientBundle();
  }, [loadPatientBundle]);

  const handleOpenEmergency = (tipo: '112' | 'medico') => {
    setEmergencyNote('');
    setEmergencySent(false);
    setEmergencyModal(tipo);
  };

  const handleDispatchEmergencyAlert = async () => {
    if (!patient || !emergencyModal) return;
    setSendingEmergency(true);
    try {
      const res = await fetch(`/api/patients/${patient.codice}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: emergencyModal,
          nota: emergencyNote.trim(),
        }),
      });
      if (res.ok) {
        setEmergencySent(true);
      }
    } finally {
      setSendingEmergency(false);
    }
  };

  const handleProfileOrDirectoryUpdate = async () => {
    await onPatientDirectoryRefresh();
    await loadPatientBundle();
  };

  const pendingConsentCount = patient?.richieste_consenso_pendenti.length ?? 0;

  const handleSelectTab = (tabId: PatientTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-14 pb-24">
      {/* BARRA SUPERIORE FISSA CON BOTTONI DI EMERGENZA SEMPRE ACCESSIBILI */}
      <header
        data-testid="patient-emergency-topbar"
        className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-slate-200 shadow-xs px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-teal-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
            OC
          </div>
          <span className="hidden sm:inline font-display text-base font-semibold text-slate-900 whitespace-nowrap shrink-0">
            OncoCare AI
          </span>
          {patient && (
            <span className="hidden md:inline text-xs text-slate-500 truncate">
              · {patient.nome} {patient.cognome} ({patient.codice})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenEmergency('medico')}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Chiama Medico</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenEmergency('112')}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
            <span>Chiama 112</span>
          </button>

          <button
            type="button"
            onClick={onSwitchRole}
            aria-label="Cambia ruolo o esci"
            title="Cambia ruolo"
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading && !patient ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-600">
            Caricamento area paziente in corso...
          </div>
        ) : loadError || !patient ? (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-700">
            {loadError || 'Profilo paziente non disponibile.'}
          </div>
        ) : (
          <>
            {/* Patient Banner Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={patient.avatar}
                    alt={`${patient.nome} ${patient.cognome}`}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
                      Area Paziente · {patient.nome} {patient.cognome}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {patient.stadio_percorso} · Medico curante: {patient.medico_curante}
                    </p>
                  </div>
                </div>

                {pendingConsentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectTab('privacy')}
                    className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-left hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    {pendingConsentCount}{' '}
                    {pendingConsentCount === 1
                      ? 'richiesta di consenso medico in attesa'
                      : 'richieste di consenso medico in attesa'}
                  </button>
                )}
              </div>
            </div>

            {/* Active Section Content */}
            <main>
              {activeTab === 'diario' && (
                <SymptomDiarySection
                  patient={patient}
                  symptoms={symptoms}
                  onSymptomAdded={loadPatientBundle}
                />
              )}
              {activeTab === 'farmaci' && (
                <MedicationsSection
                  patient={patient}
                  medications={medications}
                  onDoseUpdated={loadPatientBundle}
                />
              )}
              {activeTab === 'calendario' && (
                <CalendarSection
                  patient={patient}
                  doctors={doctors}
                  medications={medications}
                  appointments={appointments}
                  bookingReminders={bookingReminders}
                  onCalendarUpdated={loadPatientBundle}
                />
              )}
              {activeTab === 'chat' && (
                <OncoChatSection
                  patient={patient}
                  messagesFromDoctor={messages}
                  onDataUpdated={loadPatientBundle}
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacySection
                  patient={patient}
                  doctors={doctors}
                  onUpdated={loadPatientBundle}
                />
              )}
              {activeTab === 'profilo' && (
                <ProfileSection
                  patient={patient}
                  allPatientCodes={allPatientCodes}
                  onSwitchPatient={(code) => setPatientCode(code)}
                  onProfileUpdated={handleProfileOrDirectoryUpdate}
                />
              )}
            </main>
          </>
        )}
      </div>

      {/* BARRA INFERIORE FISSA CON LE 6 CATEGORIE SEMPRE ACCESSIBILI */}
      {patient && (
        <nav
          aria-label="Categorie area paziente"
          data-testid="patient-bottom-nav"
          className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-1px_8px_rgba(15,23,42,0.06)]"
        >
          <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-1.5 h-16 grid grid-cols-6 lg:flex lg:items-center lg:justify-center gap-1 lg:gap-2">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  title={tab.label}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-1 py-1.5 lg:px-3.5 lg:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm font-medium transition-colors whitespace-nowrap min-w-0 ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="lg:hidden truncate max-w-full leading-none">
                    {tab.shortLabel}
                  </span>
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Emergency Modal (Chiama 112 / Chiama Medico) */}
      {emergencyModal && patient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    emergencyModal === '112'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  {emergencyModal === '112' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Phone className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2
                    id="emergency-modal-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    {emergencyModal === '112'
                      ? 'Emergenza Sanitaria — Chiama 112'
                      : `Contatta ${patient.medico_curante}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {emergencyModal === '112'
                      ? 'Numero Unico di Emergenza'
                      : patient.struttura_riferimento}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Chiudi finestra emergenza"
                onClick={() => setEmergencyModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emergencyModal === '112' ? (
              <div className="space-y-4 text-sm">
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs leading-relaxed">
                  <strong>Nota prototipo:</strong> l’applicazione non può effettuare
                  automaticamente la telefonata al 112 né trasmettere il GPS ai
                  soccorritori. Componi il <strong>112</strong> dal tuo telefono e
                  comunica le informazioni cliniche riepilogate qui sotto.
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="font-semibold text-slate-900">
                    Informazioni cliniche essenziali per i soccorritori:
                  </p>
                  <p>
                    <strong>Paziente:</strong> {patient.nome} {patient.cognome} (
                    {patient.codice})
                  </p>
                  {patient.consenso_dati_clinici ? (
                    <>
                      <p>
                        <strong>Diagnosi:</strong> {patient.diagnosi}
                      </p>
                      <p>
                        <strong>Terapia in corso:</strong> {patient.terapia_attuale}
                      </p>
                      <p>
                        <strong>Allergie:</strong> {patient.allergie.join(', ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-800">
                      Consenso clinico disattivato nelle impostazioni Privacy.
                    </p>
                  )}
                  <p>
                    <strong>Contatto d’emergenza:</strong>{' '}
                    {patient.contatto_emergenza.nome} (
                    {patient.contatto_emergenza.relazione}) ·{' '}
                    <span className="font-mono">
                      {patient.contatto_emergenza.telefono}
                    </span>
                  </p>
                  {patient.consenso_geolocalizzazione ? (
                    <p className="flex items-start gap-1 text-teal-800 pt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Posizione autorizzata:</strong>{' '}
                        {patient.posizione_simulata.indirizzo}
                      </span>
                    </p>
                  ) : (
                    <p className="text-slate-500">
                      Geolocalizzazione non autorizzata nelle impostazioni Privacy.
                    </p>
                  )}
                </div>

                <a
                  href="tel:112"
                  className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Avvia chiamata al 112</span>
                </a>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <p className="text-slate-900 font-semibold">
                    Recapito Struttura di Riferimento
                  </p>
                  <p className="text-slate-700">{patient.struttura_riferimento}</p>
                  <p className="font-mono text-sm font-semibold text-teal-800 pt-1">
                    {patient.telefono_struttura}
                  </p>
                </div>

                <a
                  href={`tel:${patient.telefono_struttura.replace(/\s+/g, '')}`}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Chiama {patient.telefono_struttura}</span>
                </a>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label
                htmlFor="emergency-alert-note"
                className="block text-xs font-medium text-slate-700"
              >
                Invia anche allarme immediato all’interfaccia del medico (opzionale)
              </label>
              <input
                id="emergency-alert-note"
                type="text"
                value={emergencyNote}
                onChange={(e) => setEmergencyNote(e.target.value)}
                placeholder="Breve motivo della chiamata (es. febbre improvvisa, dolore)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
              {emergencySent ? (
                <p className="text-xs font-medium text-emerald-700">
                  Notifica inviata nell’interfaccia di {patient.medico_curante}.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={sendingEmergency}
                  onClick={() => void handleDispatchEmergencyAlert()}
                  className="w-full py-2 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-800"
                >
                  {sendingEmergency
                    ? 'Invio notifica...'
                    : `Invia notifica di ${emergencyModal === '112' ? 'Emergenza' : 'Richiesta Chiamata'} a ${patient.medico_curante}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
