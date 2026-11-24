import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, PlusCircle } from 'lucide-react';
import type { PatientProfile, SymptomCategory, SymptomEntry } from '../types/onco';
import { evaluateSymptomAlert, formatUtcToRome } from '../utils/clinicalLogic';

interface SymptomDiarySectionProps {
  patient: PatientProfile;
  symptoms: SymptomEntry[];
  onSymptomAdded: () => Promise<void>;
}

const QUICK_SYMPTOMS_FISICI = [
  'Nausea',
  'Stanchezza',
  'Diarrea',
  'Sindrome mano-piede',
  'Dolore articolare',
  'Febbre',
];

const QUICK_SYMPTOMS_PSICO = [
  'Ansia pre-controllo',
  'Insonnia',
  'Tristezza / Umore basso',
  'Preoccupazione per la terapia',
];

export const SymptomDiarySection: React.FC<SymptomDiarySectionProps> = ({
  patient,
  symptoms,
  onSymptomAdded,
}) => {
  const [categoria, setCategoria] = useState<SymptomCategory>('fisico');
  const [sintomo, setSintomo] = useState('');
  const [intensitaKnown, setIntensitaKnown] = useState(true);
  const [intensita, setIntensita] = useState(4);
  const [descrizione, setDescrizione] = useState('');
  const [filterCat, setFilterCat] = useState<'tutti' | SymptomCategory>('tutti');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'alert';
    text: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const liveEval = sintomo.trim()
    ? evaluateSymptomAlert(
        {
          sintomo: sintomo.trim(),
          intensita: intensitaKnown ? intensita : -1,
          descrizione,
          categoria,
        },
        symptoms,
        patient
      )
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (!sintomo.trim()) {
      setErrorMsg('Inserisci il nome del sintomo prima di salvare.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patient.codice}/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria,
          sintomo: sintomo.trim(),
          intensita: intensitaKnown ? intensita : -1,
          descrizione: descrizione.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Errore durante il salvataggio del sintomo.');
        return;
      }

      if (data.autoAlert) {
        setFeedback({
          type: 'alert',
          text: `Sintomo registrato. È stata inviata una segnalazione automatica (${data.autoAlert.livello_urgenza}) a ${patient.medico_curante}.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Sintomo registrato correttamente nel tuo diario sintomatologico.',
        });
      }

      setSintomo('');
      setDescrizione('');
      setIntensita(4);
      setIntensitaKnown(true);
      await onSymptomAdded();
    } catch {
      setErrorMsg('Errore di rete durante il salvataggio.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSymptoms = symptoms.filter(
    (s) => filterCat === 'tutti' || s.categoria === filterCat
  );

  const quickList =
    categoria === 'fisico' ? QUICK_SYMPTOMS_FISICI : QUICK_SYMPTOMS_PSICO;

  return (
    <div className="space-y-6">
      {!patient.consenso_diario_sintomi && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-950 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Condivisione del diario sintomatologico disattivata</p>
            <p className="mt-0.5 text-amber-900">
              I sintomi salvati qui restano privati nel tuo profilo. Puoi abilitare la
              condivisione con il medico curante e OncoCare AI nella sezione{' '}
              <strong>Privacy</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Form Nuovo Sintomo */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Registra nuovo sintomo
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Annota sintomi fisici o psicologici. I valori superiori alle soglie cliniche
          avvisano automaticamente il medico curante.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Categoria
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCategoria('fisico')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  categoria === 'fisico'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fisico
              </button>
              <button
                type="button"
                onClick={() => setCategoria('psicologico')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  categoria === 'psicologico'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Psicologico
              </button>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">
              Selezione rapida
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickList.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSintomo(item)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    sintomo === item
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="symptom-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Sintomo percepito
            </label>
            <input
              id="symptom-name"
              type="text"
              value={sintomo}
              onChange={(e) => setSintomo(e.target.value)}
              placeholder="Es. Nausea, Stanchezza, Formicolio..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="symptom-intensity"
                className="text-sm font-medium text-slate-700"
              >
                Intensità (0–10)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!intensitaKnown}
                  onChange={(e) => setIntensitaKnown(!e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>Non indicata</span>
              </label>
            </div>

            {intensitaKnown ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <input
                    id="symptom-intensity"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={intensita}
                    onChange={(e) => setIntensita(Number(e.target.value))}
                    className="flex-1 accent-teal-700"
                  />
                  <span
                    className={`w-12 text-right font-mono text-base font-semibold tabular-nums ${
                      intensita >= 7
                        ? 'text-red-700'
                        : intensita >= 4
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }`}
                  >
                    {intensita}/10
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0 Assente</span>
                  <span>5 Moderato</span>
                  <span>10 Massimo</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-1">
                Verrà registrato senza punteggio numerico (intensità non indicata).
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="symptom-desc"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Da quando e caratteristiche
            </label>
            <textarea
              id="symptom-desc"
              rows={3}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es. Comparso da stamattina dopo colazione, temperatura 38.2 °C..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          {liveEval && liveEval.isEmergency && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Possibile segno d’allarme clinico rilevato
                </p>
                <p className="mt-0.5">
                  In presenza di febbre ≥ 38 °C, dolore toracico o difficoltà respiratoria
                  usa subito il pulsante rosso <strong>Chiama 112</strong> in alto.
                </p>
              </div>
            </div>
          )}

          {liveEval && !liveEval.isEmergency && liveEval.requiresDoctorAlert && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Segnalazione automatica al medico</p>
                <p className="mt-0.5">{liveEval.reasons[0]}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${
                feedback.type === 'alert'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{submitting ? 'Salvataggio...' : 'Salva nel Diario'}</span>
          </button>
        </form>
      </section>

      {/* Storico Diario */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Storico Diario Sintomatologico
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {filteredSymptoms.length} rilevazioni registrate · Ora italiana
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['tutti', 'fisico', 'psicologico'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterCat(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize whitespace-nowrap shrink-0 ${
                  filterCat === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredSymptoms.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nessun sintomo registrato in questa categoria
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Usa il modulo a fianco per aggiungere la tua prima rilevazione.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {filteredSymptoms.map((entry) => {
              const intensityLabel =
                entry.intensita >= 0 ? `${entry.intensita}/10` : 'Non indicata';
              const intensityColor =
                entry.intensita >= 7
                  ? 'text-red-700'
                  : entry.intensita >= 4
                    ? 'text-amber-700'
                    : entry.intensita >= 0
                      ? 'text-emerald-700'
                      : 'text-slate-500';

              return (
                <article key={entry.id} className="py-4 first:pt-2 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {entry.sintomo}
                    </h3>
                    <span className={`font-mono text-sm font-semibold tabular-nums ${intensityColor}`}>
                      Intensità {intensityLabel}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{entry.categoria}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatUtcToRome(entry.data_ora)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {entry.fonte === 'chat_ai'
                        ? 'Registrato via Onco Chat'
                        : 'Inserimento manuale'}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {entry.descrizione}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};
