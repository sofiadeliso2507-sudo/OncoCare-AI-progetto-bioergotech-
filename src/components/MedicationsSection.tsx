import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Lock,
  Plane,
} from 'lucide-react';
import type { MedicationScheduleItem, PatientProfile } from '../types/onco';
import {
  canMarkDoseAsAssunta,
  classifyDoseStatus,
  formatRomeTimeOnly,
  formatUtcToRome,
  isSameRomeDay,
} from '../utils/clinicalLogic';
import { MedicationLeafletModal } from './ClinicalDetailModals';

interface MedicationsSectionProps {
  patient: PatientProfile;
  medications: MedicationScheduleItem[];
  onDoseUpdated: () => Promise<void>;
}

export const MedicationsSection: React.FC<MedicationsSectionProps> = ({
  patient,
  medications,
  onDoseUpdated,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedMed, setSelectedMed] = useState<MedicationScheduleItem | null>(
    null
  );
  const [actionMsg, setActionMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Travel supply calculator
  const [travelDays, setTravelDays] = useState(5);
  const [travelDest, setTravelDest] = useState('');

  const now = new Date();
  const todayDoses = medications.filter((m) => isSameRomeDay(m.orario_previsto, now));

  const uniqueDrugs = Array.from(
    new Map(medications.map((m) => [m.farmaco, m])).values()
  );

  const handleMarkTaken = async (dose: MedicationScheduleItem) => {
    setActionMsg(null);
    const check = canMarkDoseAsAssunta(dose, new Date());
    if (!check.allowed) {
      setActionMsg({
        type: 'error',
        text: check.reason || 'Impossibile segnare questa dose.',
      });
      return;
    }

    setBusyId(dose.id);
    try {
      const res = await fetch(
        `/api/patients/${patient.codice}/medications/${dose.id}/take`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) {
        setActionMsg({
          type: 'error',
          text: data.error || 'Impossibile aggiornare la dose.',
        });
        return;
      }
      setActionMsg({
        type: 'success',
        text: `${dose.farmaco} (${dose.dosaggio}) segnata come assunta.`,
      });
      await onDoseUpdated();
    } catch {
      setActionMsg({
        type: 'error',
        text: 'Errore di connessione durante l’aggiornamento.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {!patient.consenso_dati_clinici && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Consenso ai dati clinici disattivato</p>
            <p className="mt-0.5 text-amber-800">
              Nella sezione Privacy hai disattivato il consenso clinico: i dettagli del
              piano terapeutico rimangono consultabili solo da te finché non riattivi la
              condivisione con il medico o l’assistente AI.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Today's Checklist */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              Checklist Terapeutica di Oggi
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Orari convertiti in ora italiana (Europe/Rome). Le dosi future restano
              bloccate fino all’orario previsto per sicurezza.
            </p>
          </div>

          {actionMsg && (
            <div
              className={`mt-4 p-3 rounded-lg border text-sm flex items-start gap-2 ${
                actionMsg.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {actionMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{actionMsg.text}</span>
            </div>
          )}

          {todayDoses.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-600">
              Nessuna dose programmata per la giornata odierna.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {todayDoses.map((dose) => {
                const status = classifyDoseStatus(dose, now);
                const romeTime = formatRomeTimeOnly(dose.orario_previsto);

                return (
                  <div
                    key={dose.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        {status === 'assunta' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                        )}
                        {status === 'da_assumere_ora' && (
                          <Clock className="w-5 h-5 text-teal-700 shrink-0" />
                        )}
                        {status === 'bloccata' && (
                          <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedMed(dose)}
                          className="text-left text-base font-semibold text-slate-900 hover:text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
                        >
                          {dose.farmaco} · {dose.dosaggio}
                        </button>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pl-7">
                        <span className="font-mono tabular-nums font-medium text-slate-700">
                          Ore {romeTime}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{dose.quantita}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {status === 'assunta'
                            ? `Assunta${dose.assunta_il ? ` (${formatUtcToRome(dose.assunta_il)})` : ''}`
                            : status === 'da_assumere_ora'
                              ? 'Da assumere ora'
                              : `Bloccata fino alle ${romeTime}`}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 pl-7">
                        {dose.istruzioni_assunzione}
                      </p>
                    </div>

                    <div className="pl-7 sm:pl-0 flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedMed(dose)}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-700 hover:bg-teal-50/50 text-slate-700 hover:text-teal-900 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bugiardino</span>
                      </button>

                      {status === 'assunta' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkTaken(dose)}
                          className="px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium whitespace-nowrap"
                        >
                          [x] Assunta
                        </button>
                      ) : status === 'da_assumere_ora' ? (
                        <button
                          type="button"
                          disabled={busyId === dose.id}
                          onClick={() => handleMarkTaken(dose)}
                          className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          {busyId === dose.id ? 'Registrazione...' : 'Segna Assunta'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkTaken(dose)}
                          className="px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium whitespace-nowrap"
                        >
                          Bloccata ({romeTime})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Schede Farmaci + Viaggio */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Schede Farmaci e Reperibilità
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tocca un farmaco per aprire il foglietto illustrativo completo
              (bugiardino), interazioni e avvertenze.
            </p>

            <div className="space-y-3 mt-4">
              {uniqueDrugs.map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  onClick={() => setSelectedMed(drug)}
                  className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-teal-700 hover:bg-teal-50/30 transition-colors space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {drug.farmaco}
                    </h3>
                    <span className="font-mono text-xs text-slate-600 tabular-nums">
                      {drug.dosaggio}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-700">Assunzione:</strong>{' '}
                    {drug.istruzioni_assunzione}
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-700">Reperibilità:</strong>{' '}
                    {drug.reperibilita}
                  </p>
                  <p className="text-xs text-red-700">
                    <strong className="font-semibold">Controindicazioni:</strong>{' '}
                    {drug.controindicazioni}
                  </p>
                  <p className="text-xs font-semibold text-teal-800 pt-0.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Apri bugiardino completo →</span>
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2.5">
              <Plane className="w-4 h-4 text-teal-700 shrink-0" />
              <h2 className="text-base font-semibold text-slate-900">
                Pianificazione Scorte per Viaggi
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              L’app non può verificare in tempo reale le scorte delle farmacie esterne.
              Calcola la scorta minima consigliata con margine di sicurezza.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="travel-dest"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Destinazione
                </label>
                <input
                  id="travel-dest"
                  type="text"
                  value={travelDest}
                  onChange={(e) => setTravelDest(e.target.value)}
                  placeholder="Es. Roma, Parigi..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label
                  htmlFor="travel-days"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Durata (giorni)
                </label>
                <input
                  id="travel-days"
                  type="number"
                  min={1}
                  max={60}
                  value={travelDays}
                  onChange={(e) =>
                    setTravelDays(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Scorta consigliata:</strong> copertura per{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {travelDays + 3} giorni
                </span>{' '}
                (viaggio + 3 giorni di margine){travelDest ? ` verso ${travelDest}` : ''}.
              </p>
              <p className="text-slate-600">
                Porta con te il piano terapeutico firmato e chiedi conferma al medico o al
                farmacista locale prima della partenza.
              </p>
            </div>
          </section>
        </div>
      </div>

      <MedicationLeafletModal
        medication={selectedMed}
        onClose={() => setSelectedMed(null)}
        onMarkTaken={handleMarkTaken}
        busyId={busyId}
      />
    </div>
  );
};
