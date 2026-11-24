import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  MessageSquareHeart,
  Send,
  ShieldAlert,
} from 'lucide-react';
import type { ChatTurn, DirectMessage, PatientProfile } from '../types/onco';
import { formatUtcToRome } from '../utils/clinicalLogic';

interface OncoChatSectionProps {
  patient: PatientProfile;
  messagesFromDoctor: DirectMessage[];
  onDataUpdated: () => Promise<void>;
}

export const OncoChatSection: React.FC<OncoChatSectionProps> = ({
  patient,
  messagesFromDoctor,
  onDataUpdated,
}) => {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ciao, sono OncoCare AI, il tuo assistente digitale di follow-up. Nell’app credenziali e verifica biometrica risultano già verificate (simulazione). Per iniziare e accedere ai tuoi dati, indicami pure il tuo codice paziente.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...turns, userTurn].filter((t) => !t.error);
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: turns
            .filter((t) => !t.error)
            .map((t) => ({ role: t.role, text: t.text })),
          message: trimmed,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text:
              data.error ||
              'Non è stato possibile contattare OncoCare AI. Riprova tra poco o chiama direttamente il tuo medico.',
            timestamp: new Date().toISOString(),
            error: true,
          },
        ]);
        return;
      }

      const aiTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString(),
        toolActions: Array.isArray(data.toolActions) ? data.toolActions : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setTurns((prev) => [...prev, aiTurn]);
      // Refresh clinical state (diary, doses, alerts) in case the AI ran write tools
      await onDataUpdated();
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Errore di rete nella comunicazione con il server OncoCare AI.',
          timestamp: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const quickPrompts = [
    `Il mio codice è ${patient.codice}. Quali farmaci devo prendere oggi?`,
    `Codice ${patient.codice}: quando è il mio prossimo appuntamento?`,
    `Codice ${patient.codice}: ho nausea da stamattina, intensità 5 su 10.`,
    `Codice ${patient.codice}: cos'è il test farmacogenomico DPYD su PharmGKB?`,
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Onco Chat Column */}
      <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[620px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Onco Chat · Assistente Follow-up
              </h2>
              <p className="text-xs text-slate-500">
                Non sostituisce il medico né il 112 · Codice attivo:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {patient.codice}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col ${
                turn.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  turn.role === 'user'
                    ? 'bg-teal-700 text-white'
                    : turn.error
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                {turn.error && (
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Avviso tecnico</span>
                  </div>
                )}
                {turn.text}
              </div>

              {turn.toolActions && turn.toolActions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 px-1">
                  <span>Azioni registrate:</span>
                  {turn.toolActions.map((act, i) => (
                    <React.Fragment key={`${turn.id}-act-${i}`}>
                      {i > 0 && <span aria-hidden="true">·</span>}
                      <span className="font-medium text-teal-800">{act}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {turn.sources && turn.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2 px-1">
                  {turn.sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-800 hover:underline"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-start">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
                OncoCare AI sta elaborando la risposta...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(qp)}
              className="text-left text-xs px-2.5 py-1.5 rounded-md bg-white border border-slate-200 hover:border-teal-700 text-slate-700 transition-colors disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex items-center gap-3"
        >
          <label htmlFor="onco-chat-input" className="sr-only">
            Scrivi a OncoCare AI
          </label>
          <input
            id="onco-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrivi un messaggio (non inserire password o PIN)..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Invia</span>
          </button>
        </form>
      </section>

      {/* Right Column: Doctor Replies & Safety Notice */}
      <aside className="lg:col-span-4 space-y-5">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-900">
            Risposte dal Medico Curante
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Quando l’AI invia una segnalazione, il medico risponde qui su OncoCare o
            tramite WhatsApp/email.
          </p>

          {messagesFromDoctor.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500 py-4 border-t border-slate-100">
              Nessun messaggio diretto recente dal medico.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 mt-3">
              {messagesFromDoctor.map((msg) => (
                <div key={msg.id} className="py-3 first:pt-2 last:pb-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {msg.nome_mittente}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      via {msg.canale}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {msg.testo}
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {formatUtcToRome(msg.data_ora)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
            <h3 className="text-sm font-semibold">Regole di Sicurezza</h3>
          </div>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>
              L’assistente non può prescrivere, sostituire o modificare dosi dei farmaci.
            </li>
            <li>
              Non condividere mai password, PIN o dati biometrici nella chat.
            </li>
            <li>
              Per sintomi gravi (dolore toracico, dispnea, febbre ≥ 38 °C) usa subito il
              pulsante <strong>Chiama 112</strong> nella barra superiore.
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
};
