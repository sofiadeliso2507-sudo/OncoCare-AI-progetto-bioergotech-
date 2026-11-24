import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Lock,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { DoctorProfile, PatientProfile } from '../types/onco';
import { formatUtcToRome } from '../utils/clinicalLogic';

interface PrivacySectionProps {
  patient: PatientProfile;
  doctors: DoctorProfile[];
  onUpdated: () => Promise<void>;
}

const SCOPE_LABELS: Record<'cartella' | 'diario' | 'entrambi', string> = {
  cartella: 'Cartella clinica elettronica',
  diario: 'Diario sintomatologico',
  entrambi: 'Cartella clinica e Diario sintomatologico',
};

export const PrivacySection: React.FC<PrivacySectionProps> = ({
  patient,
  doctors,
  onUpdated,
}) => {
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const updatePrivacy = async (payload: Record<string, unknown>, message: string) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/patients/${patient.codice}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatusMsg(message);
        await onUpdated();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Pending Doctor Consent Requests */}
      {patient.richieste_consenso_pendenti.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-amber-950">
            Richieste di accesso a cartella clinica e diario dei sintomi
          </h2>
          <p className="text-xs text-amber-900 mt-1">
            I seguenti professionisti sanitari hanno richiesto di consultare i tuoi dati.
            Puoi acconsentire o rifiutare separatamente in base all’ambito indicato.
          </p>

          <div className="mt-4 space-y-3">
            {patient.richieste_consenso_pendenti.map((req) => {
              const scope = req.ambito ?? 'entrambi';
              return (
                <div
                  key={req.doctorId}
                  className="bg-white border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {req.doctorName}
                    </p>
                    <p className="text-xs text-teal-800 font-medium mt-0.5">
                      Ambito richiesto: {SCOPE_LABELS[scope]}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                      Richiesta inviata: {formatUtcToRome(req.richiestaIl)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void updatePrivacy(
                          { approveDoctorId: req.doctorId, ambito: scope },
                          `Consenso concesso a ${req.doctorName} (${SCOPE_LABELS[scope]}).`
                        )
                      }
                      className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium whitespace-nowrap"
                    >
                      Acconsenti
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void updatePrivacy(
                          { rejectDoctorId: req.doctorId, ambito: scope },
                          `Accesso negato a ${req.doctorName}.`
                        )
                      }
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap"
                    >
                      Rifiuta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Global GDPR Toggles */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Consensi GDPR e Protezione Dati
              </h2>
              <p className="text-xs text-slate-500">
                Ogni condivisione avviene solo previa autorizzazione esplicita.
              </p>
            </div>
          </div>

          <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-700" />
                <span>Condivisione cartella clinica elettronica</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consente ai medici autorizzati e all’assistente OncoCare AI di
                consultare diagnosi, terapie, allergie e profilo farmacogenomico. Se
                disattivato, nessun medico può leggere la cartella clinica.
              </p>
            </div>
            <input
              type="checkbox"
              checked={patient.consenso_dati_clinici}
              disabled={saving}
              onChange={(e) =>
                void updatePrivacy(
                  { consenso_dati_clinici: e.target.checked },
                  e.target.checked
                    ? 'Consenso alla cartella clinica attivato.'
                    : 'Consenso alla cartella clinica revocato.'
                )
              }
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-700 focus:ring-teal-700 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-700" />
                <span>Condivisione del diario sintomatologico</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consente ai medici autorizzati e ad OncoCare AI di consultare lo
                storico dei sintomi fisici e psicologici annotati nel diario. Se
                disattivato, i sintomi restano visibili solo a te.
              </p>
            </div>
            <input
              type="checkbox"
              checked={patient.consenso_diario_sintomi}
              disabled={saving}
              onChange={(e) =>
                void updatePrivacy(
                  { consenso_diario_sintomi: e.target.checked },
                  e.target.checked
                    ? 'Consenso alla condivisione del diario dei sintomi attivato.'
                    : 'Consenso alla condivisione del diario dei sintomi revocato.'
                )
              }
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-700 focus:ring-teal-700 shrink-0"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span>Geolocalizzazione per emergenze (simulata)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se autorizzata, la posizione simulata ({patient.posizione_simulata.citta})
                viene mostrata nella scheda di emergenza 112 e nelle segnalazioni
                critiche al medico.
              </p>
            </div>
            <input
              type="checkbox"
              checked={patient.consenso_geolocalizzazione}
              disabled={saving}
              onChange={(e) =>
                void updatePrivacy(
                  { consenso_geolocalizzazione: e.target.checked },
                  e.target.checked
                    ? 'Geolocalizzazione autorizzata.'
                    : 'Geolocalizzazione disattivata.'
                )
              }
              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-700 focus:ring-teal-700 shrink-0"
            />
          </label>
        </section>

        {/* Per-Doctor Checkbox Authorization */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Autorizzazioni per Professionista Sanitario
              </h2>
              <p className="text-xs text-slate-500">
                Scegli separatamente per ogni medico se può consultare la cartella
                clinica e/o il diario dei sintomi.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {doctors.map((doc) => {
              const folderDoctorChecked = patient.consensi_medici[doc.id] === true;
              const diaryDoctorChecked =
                patient.consensi_diario_medici?.[doc.id] === true;
              const folderEffective =
                patient.consenso_dati_clinici && folderDoctorChecked;
              const diaryEffective =
                patient.consenso_diario_sintomi && diaryDoctorChecked;

              return (
                <div key={doc.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {doc.nome}
                    </p>
                    <p className="text-xs text-slate-500">
                      {doc.specializzazione} · {doc.struttura}
                    </p>
                    <p className="text-xs mt-1 text-slate-600">
                      <span
                        className={`font-medium ${
                          folderEffective ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Cartella: {folderEffective ? 'Autorizzata' : 'Bloccata'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span
                        className={`font-medium ${
                          diaryEffective ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        Diario sintomi: {diaryEffective ? 'Autorizzato' : 'Bloccato'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 pt-0.5">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={folderDoctorChecked}
                        disabled={saving}
                        onChange={(e) =>
                          void updatePrivacy(
                            {
                              consensi_medici: {
                                [doc.id]: e.target.checked,
                              },
                            },
                            e.target.checked
                              ? `Accesso alla cartella autorizzato per ${doc.nome}.`
                              : `Consenso cartella revocato per ${doc.nome}.`
                          )
                        }
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span>Cartella clinica</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={diaryDoctorChecked}
                        disabled={saving}
                        onChange={(e) =>
                          void updatePrivacy(
                            {
                              consensi_diario_medici: {
                                [doc.id]: e.target.checked,
                              },
                            },
                            e.target.checked
                              ? `Accesso al diario dei sintomi autorizzato per ${doc.nome}.`
                              : `Consenso diario revocato per ${doc.nome}.`
                          )
                        }
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span>Diario sintomi</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
