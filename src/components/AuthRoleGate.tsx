import React, { useState } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  Lock,
  ScanFace,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import type { DoctorProfile, UserRole } from '../types/onco';

interface PatientDirectoryItem {
  codice: string;
  nome: string;
  cognome: string;
  avatar: string;
}

interface AuthRoleGateProps {
  patients: PatientDirectoryItem[];
  doctors: DoctorProfile[];
  onAuthenticated: (selection: {
    role: UserRole;
    patientCode?: string;
    doctorId?: string;
  }) => void;
}

export const AuthRoleGate: React.FC<AuthRoleGateProps> = ({
  patients,
  doctors,
  onAuthenticated,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState<'role' | 'credentials' | 'biometric'>('role');

  // Patient login state
  const [patientCode, setPatientCode] = useState('PZ001');
  const [username, setUsername] = useState('maria.rossi');
  const [password, setPassword] = useState('••••••••••••');

  // Doctor login state
  const [doctorId, setDoctorId] = useState('DOC01');
  const [doctorPin, setDoctorPin] = useState('••••••••');

  // Simulated biometric verification
  const [biometricMethod, setBiometricMethod] = useState<'fingerprint' | 'faceid'>(
    'fingerprint'
  );
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'verified'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'patient') {
      setPatientCode('PZ001');
      setUsername('maria.rossi');
    } else {
      setDoctorId('DOC01');
    }
    setStep('credentials');
  };

  const handlePatientSelectQuick = (p: PatientDirectoryItem) => {
    setPatientCode(p.codice);
    setUsername(`${p.nome.toLowerCase()}.${p.cognome.toLowerCase()}`);
    setErrorMsg(null);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (selectedRole === 'patient') {
      const normalized = patientCode.trim().toUpperCase();
      const exists = patients.some((p) => p.codice.toUpperCase() === normalized);
      if (!exists) {
        setErrorMsg(
          `Codice paziente "${normalized}" non trovato. Usa PZ001–PZ005 o un profilo registrato.`
        );
        return;
      }
      if (!username.trim() || !password.trim()) {
        setErrorMsg('Inserisci nome utente e password per proseguire.');
        return;
      }
      setPatientCode(normalized);
    } else if (selectedRole === 'doctor') {
      if (!doctorId || !doctorPin.trim()) {
        setErrorMsg('Seleziona il profilo medico e inserisci le credenziali.');
        return;
      }
    }
    setBiometricStatus('idle');
    setStep('biometric');
  };

  const handleSimulateBiometric = () => {
    setBiometricStatus('scanning');
    setTimeout(() => {
      setBiometricStatus('verified');
      setTimeout(() => {
        if (selectedRole === 'patient') {
          onAuthenticated({
            role: 'patient',
            patientCode: patientCode.trim().toUpperCase(),
          });
        } else {
          onAuthenticated({
            role: 'doctor',
            doctorId,
          });
        }
      }, 350);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-semibold text-sm">
              OC
            </div>
            <span className="font-display text-lg font-semibold text-slate-900 tracking-tight">
              OncoCare AI
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Prototipo Didattico · GDPR &amp; 2FA Simulato</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">
          {step === 'role' && (
            <div className="space-y-8">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-teal-800 mb-2">
                  Telemedicina &amp; Follow-up Oncologico
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight text-balance">
                  Seleziona il tuo ruolo per accedere a OncoCare AI
                </h1>
                <p className="mt-3 text-base text-slate-600 leading-relaxed">
                  L’accesso è protetto da autenticazione a due fattori simulata (credenziali e
                  verifica biometrica). Tutti i dati presenti sono simulati a scopo didattico e di
                  ricerca.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <button
                  type="button"
                  onClick={() => handleSelectRole('patient')}
                  className="text-left bg-white border border-slate-200 hover:border-teal-700 rounded-xl p-6 transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <div>
                    <div className="w-11 h-11 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center mb-5">
                      <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Accesso Paziente
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Diario sintomatologico, checklist terapie, calendario visite, assistente
                      Onco Chat, gestione consensi GDPR e chiamate rapide di emergenza.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-teal-800">
                    <span>Entra come Paziente</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('doctor')}
                  className="text-left bg-white border border-slate-200 hover:border-slate-900 rounded-xl p-6 transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <div>
                    <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mb-5">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Professionista Sanitario
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Monitoraggio pazienti autorizzati, notifiche ed emergenze generate dall’AI,
                      revisione diario sintomi e profili farmacogenomici PharmGKB.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-slate-900">
                    <span>Entra come Medico</span>
                    <span aria-hidden="true">→</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'credentials' && (
            <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">
                    Autenticazione 2FA · Passo 1 di 2
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900 mt-1">
                    {selectedRole === 'patient'
                      ? 'Credenziali Paziente'
                      : 'Credenziali Professionista Sanitario'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className="text-sm text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Cambia ruolo
                </button>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-5">
                {selectedRole === 'patient' ? (
                  <>
                    <div>
                      <span className="block text-xs font-medium text-slate-600 mb-2">
                        Profili demo disponibili
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {patients.map((p) => {
                          const active =
                            patientCode.trim().toUpperCase() === p.codice.toUpperCase();
                          return (
                            <button
                              key={p.codice}
                              type="button"
                              onClick={() => handlePatientSelectQuick(p)}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                                active
                                  ? 'border-teal-700 bg-teal-50/50 text-slate-900'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <img
                                src={p.avatar}
                                alt={`${p.nome} ${p.cognome}`}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-lg object-cover shrink-0 bg-slate-200"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">
                                  {p.nome} {p.cognome}
                                </div>
                                <div className="text-xs font-mono text-slate-500 tabular-nums">
                                  {p.codice}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="patient-code-input"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Codice Paziente
                      </label>
                      <input
                        id="patient-code-input"
                        type="text"
                        value={patientCode}
                        onChange={(e) => setPatientCode(e.target.value)}
                        placeholder="Es. PZ001"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="patient-username"
                          className="block text-sm font-medium text-slate-700 mb-1.5"
                        >
                          Nome utente
                        </label>
                        <input
                          id="patient-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="patient-password"
                          className="block text-sm font-medium text-slate-700 mb-1.5"
                        >
                          Password (simulata)
                        </label>
                        <input
                          id="patient-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="doctor-select"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Seleziona Medico
                      </label>
                      <select
                        id="doctor-select"
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.nome} — {doc.specializzazione}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="doctor-pin"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Password / PIN Aziendale (simulato)
                      </label>
                      <input
                        id="doctor-pin"
                        type="password"
                        value={doctorPin}
                        onChange={(e) => setDoctorPin(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </>
                )}

                {errorMsg && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Prosegui con Verifica Biometrica</span>
                </button>
              </form>
            </div>
          )}

          {step === 'biometric' && (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-left">
                <div>
                  <p className="text-xs text-slate-500">
                    Autenticazione 2FA · Passo 2 di 2
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                    Verifica Biometrica Simulata
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Indietro
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBiometricMethod('fingerprint')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    biometricMethod === 'fingerprint'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Impronta Digitale
                </button>
                <button
                  type="button"
                  onClick={() => setBiometricMethod('faceid')}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                    biometricMethod === 'faceid'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Face ID
                </button>
              </div>

              <div className="my-8 flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-2xl border flex items-center justify-center transition-colors ${
                    biometricStatus === 'verified'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : biometricStatus === 'scanning'
                        ? 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {biometricStatus === 'verified' ? (
                    <CheckCircle2 className="w-10 h-10" />
                  ) : biometricMethod === 'fingerprint' ? (
                    <Fingerprint className="w-10 h-10" />
                  ) : (
                    <ScanFace className="w-10 h-10" />
                  )}
                </div>

                <p className="mt-4 text-sm text-slate-600 max-w-xs">
                  {biometricStatus === 'idle' &&
                    `Schermata dimostrativa 2FA: conferma la lettura ${
                      biometricMethod === 'fingerprint'
                        ? 'dell’impronta digitale'
                        : 'del riconoscimento facciale'
                    } per sbloccare la cartella clinica.`}
                  {biometricStatus === 'scanning' && 'Verifica biometrica in corso...'}
                  {biometricStatus === 'verified' &&
                    'Identità verificata. Accesso autorizzato.'}
                </p>
              </div>

              <button
                type="button"
                disabled={biometricStatus !== 'idle'}
                onClick={handleSimulateBiometric}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {biometricStatus === 'idle'
                  ? `Simula ${biometricMethod === 'fingerprint' ? 'Impronta Digitale' : 'Face ID'}`
                  : biometricStatus === 'scanning'
                    ? 'Verifica in corso...'
                    : 'Accesso completato'}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>OncoCare AI · Piattaforma sperimentale di follow-up oncologico</span>
          <span>Conformità GDPR · Dati simulati a scopo didattico e di ricerca</span>
        </div>
      </footer>
    </div>
  );
};
