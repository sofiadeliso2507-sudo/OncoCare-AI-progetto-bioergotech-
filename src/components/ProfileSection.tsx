import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Dna,
  Edit3,
  ExternalLink,
  Plus,
  UserPlus,
} from 'lucide-react';
import type { PatientProfile } from '../types/onco';

interface ProfileSectionProps {
  patient: PatientProfile;
  allPatientCodes: { codice: string; nome: string; cognome: string }[];
  onSwitchPatient: (codice: string) => void;
  onProfileUpdated: () => Promise<void>;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  patient,
  allPatientCodes,
  onSwitchPatient,
  onProfileUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  const [diagnosi, setDiagnosi] = useState(patient.diagnosi);
  const [stadio, setStadio] = useState(patient.stadio_percorso);
  const [terapia, setTerapia] = useState(patient.terapia_attuale);
  const [allergieStr, setAllergieStr] = useState(patient.allergie.join(', '));
  const [tossicitaStr, setTossicitaStr] = useState(
    patient.tossicita_attese.join(', ')
  );
  const [noteCliniche, setNoteCliniche] = useState(patient.note_cliniche);
  const [emergenzaNome, setEmergenzaNome] = useState(
    patient.contatto_emergenza.nome
  );
  const [emergenzaTel, setEmergenzaTel] = useState(
    patient.contatto_emergenza.telefono
  );

  // New custom patient fields
  const [newCode, setNewCode] = useState('PZ006');
  const [newNome, setNewNome] = useState('');
  const [newCognome, setNewCognome] = useState('');
  const [newDiagnosi, setNewDiagnosi] = useState('');
  const [newTerapia, setNewTerapia] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDiagnosi(patient.diagnosi);
    setStadio(patient.stadio_percorso);
    setTerapia(patient.terapia_attuale);
    setAllergieStr(patient.allergie.join(', '));
    setTossicitaStr(patient.tossicita_attese.join(', '));
    setNoteCliniche(patient.note_cliniche);
    setEmergenzaNome(patient.contatto_emergenza.nome);
    setEmergenzaTel(patient.contatto_emergenza.telefono);
  }, [patient]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/patients/${patient.codice}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosi: diagnosi.trim(),
          stadio_percorso: stadio.trim(),
          terapia_attuale: terapia.trim(),
          allergie: allergieStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          tossicita_attese: tossicitaStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          note_cliniche: noteCliniche.trim(),
          contatto_emergenza: {
            ...patient.contatto_emergenza,
            nome: emergenzaNome.trim(),
            telefono: emergenzaTel.trim(),
          },
        }),
      });
      if (res.ok) {
        setEditing(false);
        setMsg(
          'Profilo aggiornato. L’app e l’assistente OncoCare AI si sono adattati ai nuovi dati clinici.'
        );
        await onProfileUpdated();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newNome.trim() || !newCognome.trim() || !newDiagnosi.trim()) {
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codice: newCode.trim().toUpperCase(),
          nome: newNome.trim(),
          cognome: newCognome.trim(),
          diagnosi: newDiagnosi.trim(),
          terapia_attuale: newTerapia.trim() || 'Terapia personalizzata in valutazione',
        }),
      });
      const data = await res.json();
      if (res.ok && data.patient) {
        setCreatingNew(false);
        setNewNome('');
        setNewCognome('');
        setNewDiagnosi('');
        setNewTerapia('');
        onSwitchPatient(data.patient.codice);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Header Profile & Dynamic Patient Switcher */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={patient.avatar}
            alt={`${patient.nome} ${patient.cognome}`}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {patient.nome} {patient.cognome}
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                · {patient.codice}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{patient.stadio_percorso}</p>
            <p className="text-xs text-slate-500 mt-1">
              Medico curante: {patient.medico_curante} · {patient.struttura_riferimento}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <label htmlFor="switch-patient-select" className="sr-only">
            Cambia paziente simulato
          </label>
          <select
            id="switch-patient-select"
            value={patient.codice}
            onChange={(e) => onSwitchPatient(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            {allPatientCodes.map((p) => (
              <option key={p.codice} value={p.codice}>
                {p.codice} — {p.nome} {p.cognome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setCreatingNew(false);
            }}
            className="px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editing ? 'Annulla modifica' : 'Adatta dati clinici'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreatingNew((v) => !v);
              setEditing(false);
            }}
            className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nuovo profilo demo</span>
          </button>
        </div>
      </section>

      {/* Create New Custom Patient Form */}
      {creatingNew && (
        <section className="bg-white border border-teal-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Crea nuovo profilo paziente simulato
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Inserendo nuove informazioni cliniche, l’intera applicazione (diario, soglie
            di allarme, assistente Onco Chat) si adatterà al nuovo paziente.
          </p>
          <form
            onSubmit={handleCreateCustomPatient}
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Codice Paziente
              </label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cognome
                </label>
                <input
                  type="text"
                  required
                  value={newCognome}
                  onChange={(e) => setNewCognome(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Diagnosi oncologica (simulata)
              </label>
              <input
                type="text"
                required
                value={newDiagnosi}
                onChange={(e) => setNewDiagnosi(e.target.value)}
                placeholder="Es. Carcinoma polmonare non a piccole cellule..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Terapia attuale
              </label>
              <input
                type="text"
                value={newTerapia}
                onChange={(e) => setNewTerapia(e.target.value)}
                placeholder="Es. Osimertinib 80 mg/die"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreatingNew(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crea e attiva profilo</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Clinical Details (Read or Edit Mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-100">
            Cartella Clinica Elettronica (Simulata)
          </h3>

          {editing ? (
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Diagnosi
                </label>
                <input
                  type="text"
                  value={diagnosi}
                  onChange={(e) => setDiagnosi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fase del percorso
                </label>
                <input
                  type="text"
                  value={stadio}
                  onChange={(e) => setStadio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Terapia attuale
                </label>
                <input
                  type="text"
                  value={terapia}
                  onChange={(e) => setTerapia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tossicità attese (separate da virgola)
                </label>
                <input
                  type="text"
                  value={tossicitaStr}
                  onChange={(e) => setTossicitaStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allergie (separate da virgola)
                </label>
                <input
                  type="text"
                  value={allergieStr}
                  onChange={(e) => setAllergieStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Note cliniche e soglie di allerta
                </label>
                <textarea
                  rows={3}
                  value={noteCliniche}
                  onChange={(e) => setNoteCliniche(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contatto emergenza (Nome)
                  </label>
                  <input
                    type="text"
                    value={emergenzaNome}
                    onChange={(e) => setEmergenzaNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telefono emergenza
                  </label>
                  <input
                    type="text"
                    value={emergenzaTel}
                    onChange={(e) => setEmergenzaTel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
                >
                  {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="divide-y divide-slate-100 mt-2 text-sm">
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Diagnosi</dt>
                <dd className="sm:col-span-2 text-slate-900 font-medium">
                  {patient.diagnosi}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Terapia attuale</dt>
                <dd className="sm:col-span-2 text-slate-900">
                  {patient.terapia_attuale}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Tossicità attese</dt>
                <dd className="sm:col-span-2 text-slate-700">
                  {patient.tossicita_attese.join(' · ')}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Allergie</dt>
                <dd className="sm:col-span-2 text-red-700 font-medium">
                  {patient.allergie.join(' · ')}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Note cliniche</dt>
                <dd className="sm:col-span-2 text-slate-700 leading-relaxed">
                  {patient.note_cliniche || 'Nessuna nota aggiuntiva.'}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <dt className="text-slate-500 font-medium">Contatto emergenza</dt>
                <dd className="sm:col-span-2 text-slate-900">
                  {patient.contatto_emergenza.nome} ({patient.contatto_emergenza.relazione})
                  {' · '}
                  <span className="font-mono tabular-nums">
                    {patient.contatto_emergenza.telefono}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Pharmacogenomics Section (PharmGKB Integration Preview) */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="pb-4 border-b border-slate-100 flex items-center gap-2.5">
            <Dna className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Profilo Farmacogenomico
              </h3>
              <p className="text-xs text-slate-500">
                Predisposizione integrata con risorse scientifiche PharmGKB
              </p>
            </div>
          </div>

          {patient.profilo_farmacogenomico.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              Nessuna variante farmacogenetica registrata per questo profilo.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {patient.profilo_farmacogenomico.map((pgx) => (
                <div key={pgx.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {pgx.gene} · {pgx.allele}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        pgx.rischio_tossicita === 'elevato'
                          ? 'text-red-700'
                          : pgx.rischio_tossicita === 'moderato'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      Rischio {pgx.rischio_tossicita}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{pgx.fenotipo}</p>
                  <p className="text-xs text-slate-800">
                    <strong>Farmaco:</strong> {pgx.farmaco_correlato}
                  </p>
                  <p className="text-xs text-slate-700">{pgx.efficacia_prevista}</p>
                  <a
                    href={pgx.fonte_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-800 hover:underline pt-0.5"
                  >
                    <span>Scheda PharmGKB</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
