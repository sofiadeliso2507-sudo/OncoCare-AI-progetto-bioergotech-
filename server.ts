import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  addAppointment,
  addBookingReminder,
  addMedicationScheduleItem,
  addSymptom,
  bookAppointment,
  createCustomPatient,
  createDoctorAlert,
  getAlertsForDoctor,
  getAllPatientsForDoctorList,
  getAppointments,
  getBookingReminders,
  getDoctors,
  getMedications,
  getMessagesForPatient,
  getPatientByCode,
  getSymptoms,
  markDoseAssunta,
  requestDoctorConsent,
  resetDemoDatabase,
  respondToAlert,
  updatePatientConsents,
  upsertPatientProfile,
} from './server/clinicalStore.ts';
import { runOncoCareAgent } from './server/oncoAgent.ts';
import type { PatientProfile, SymptomCategory, UrgencyLevel } from './src/types/onco.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // --- API Routes ---

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post('/api/demo/reset', (_req, res) => {
    resetDemoDatabase();
    res.json({ ok: true });
  });

  app.get('/api/doctors', (_req, res) => {
    res.json({ doctors: getDoctors() });
  });

  // Patient state bundle (for Patient Portal)
  app.get('/api/patients/:code', (req, res) => {
    const patient = getPatientByCode(req.params.code);
    if (!patient) {
      res.status(404).json({ error: 'Codice paziente non trovato.' });
      return;
    }
    res.json({
      patient,
      symptoms: getSymptoms(patient.codice),
      medications: getMedications(patient.codice),
      appointments: getAppointments(patient.codice),
      bookingReminders: getBookingReminders(patient.codice),
      messages: getMessagesForPatient(patient.codice),
      doctors: getDoctors(),
    });
  });

  app.get('/api/patients', (_req, res) => {
    // Public directory of patient codes/names for prototype login selector
    const list = getAllPatientsForDoctorList('DOC01').map((item) => ({
      codice: item.codice,
      nome: item.nome,
      cognome: item.cognome,
      avatar: item.avatar,
    }));
    res.json({ patients: list });
  });

  // Update patient clinical profile (demonstrating dynamic adaptation to patient info)
  app.put('/api/patients/:code', (req, res) => {
    const updated = upsertPatientProfile(req.params.code, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.json({ patient: updated });
  });

  // Create a brand new custom patient profile
  app.post('/api/patients', (req, res) => {
    const body = req.body as Partial<PatientProfile>;
    if (!body?.codice || !body?.nome || !body?.cognome || !body?.diagnosi) {
      res.status(400).json({
        error: 'Codice, nome, cognome e diagnosi sono obbligatori.',
      });
      return;
    }
    const created = createCustomPatient({
      codice: body.codice.trim().toUpperCase(),
      nome: body.nome.trim(),
      cognome: body.cognome.trim(),
      data_nascita: body.data_nascita ?? '1975-01-01',
      avatar:
        body.avatar ?? '/src/assets/images/avatar_maria_rossi_1795538684414.jpg',
      diagnosi: body.diagnosi.trim(),
      stadio_percorso: body.stadio_percorso ?? 'Follow-up attivo',
      terapia_attuale: body.terapia_attuale ?? 'Da definire con oncologo',
      tossicita_attese: Array.isArray(body.tossicita_attese)
        ? body.tossicita_attese
        : ['nausea', 'stanchezza'],
      allergie: Array.isArray(body.allergie) ? body.allergie : ['Nessuna nota'],
      note_cliniche: body.note_cliniche ?? '',
      medico_curante_id: body.medico_curante_id ?? 'DOC01',
      medico_curante: body.medico_curante ?? 'Dr.ssa Elena Bianchi',
      struttura_riferimento:
        body.struttura_riferimento ?? 'Istituto Oncologico San Marco — Milano',
      telefono_struttura: body.telefono_struttura ?? '+39 02 5550 1400',
      contatto_emergenza: body.contatto_emergenza ?? {
        nome: 'Familiare di riferimento',
        relazione: 'Familiare',
        telefono: '+39 333 000 0000',
      },
      consenso_dati_clinici: body.consenso_dati_clinici ?? true,
      consenso_diario_sintomi: body.consenso_diario_sintomi ?? true,
      consenso_geolocalizzazione: body.consenso_geolocalizzazione ?? false,
      posizione_simulata: body.posizione_simulata ?? {
        citta: 'Milano',
        indirizzo: 'Via Roma 10, Milano',
        lat: 45.4642,
        lng: 9.19,
      },
      consensi_medici: body.consensi_medici ?? {
        DOC01: true,
        DOC02: false,
        DOC03: false,
      },
      consensi_diario_medici: body.consensi_diario_medici ?? {
        DOC01: true,
        DOC02: false,
        DOC03: false,
      },
      richieste_consenso_pendenti: [],
      profilo_farmacogenomico: body.profilo_farmacogenomico ?? [],
    });
    res.status(201).json({ patient: created });
  });

  // Update GDPR & per-doctor consent checkboxes
  app.patch('/api/patients/:code/privacy', (req, res) => {
    const updated = updatePatientConsents(req.params.code, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.json({ patient: updated });
  });

  // Log symptom from Patient UI
  app.post('/api/patients/:code/symptoms', (req, res) => {
    const { categoria, sintomo, intensita, descrizione } = req.body ?? {};
    if (!sintomo || typeof sintomo !== 'string' || !sintomo.trim()) {
      res.status(400).json({ error: 'Il nome del sintomo è obbligatorio.' });
      return;
    }
    const cat: SymptomCategory =
      categoria === 'psicologico' ? 'psicologico' : 'fisico';
    const numericIntensity =
      typeof intensita === 'number' ? intensita : Number(intensita ?? -1);

    const added = addSymptom({
      codice_paziente: req.params.code,
      categoria: cat,
      sintomo: sintomo.trim(),
      intensita: Number.isNaN(numericIntensity) ? -1 : numericIntensity,
      descrizione: typeof descrizione === 'string' ? descrizione : '',
      fonte: 'diario',
    });

    if (!added) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.status(201).json(added);
  });

  // Mark medication dose as taken
  app.post('/api/patients/:code/medications/:doseId/take', (req, res) => {
    const result = markDoseAssunta(req.params.code, req.params.doseId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // Add medication item (doctor or custom adaptation)
  app.post('/api/patients/:code/medications', (req, res) => {
    const body = req.body ?? {};
    if (!body.farmaco || !body.dosaggio || !body.orario_previsto) {
      res.status(400).json({
        error: 'Farmaco, dosaggio e orario previsto sono obbligatori.',
      });
      return;
    }
    const created = addMedicationScheduleItem({
      codice_paziente: req.params.code,
      farmaco: String(body.farmaco),
      principio_attivo: String(body.principio_attivo ?? body.farmaco),
      dosaggio: String(body.dosaggio),
      quantita: String(body.quantita ?? '1 compressa'),
      orario_previsto: String(body.orario_previsto),
      stato: 'da_assumere',
      istruzioni_assunzione: String(
        body.istruzioni_assunzione ?? 'Seguire prescrizione medica.'
      ),
      reperibilita: String(
        body.reperibilita ?? 'Farmacia ospedaliera o territoriale'
      ),
      controindicazioni: String(
        body.controindicazioni ?? 'Segnalare eventuali effetti indesiderati al medico.'
      ),
      indicazioni_terapeutiche: body.indicazioni_terapeutiche
        ? String(body.indicazioni_terapeutiche)
        : 'Terapia oncologica o di supporto prescritta dallo specialista curante.',
      interazioni: body.interazioni
        ? String(body.interazioni)
        : 'Prima di associare nuovi farmaci, integratori o rimedi erboristici chiedere conferma al medico.',
      effetti_indesiderati: Array.isArray(body.effetti_indesiderati)
        ? body.effetti_indesiderati.map(String)
        : ['Consultare il foglietto illustrativo ufficiale e riferire eventuali sintomi nel diario.'],
      avvertenze_urgenti: body.avvertenze_urgenti
        ? String(body.avvertenze_urgenti)
        : 'Contattare subito il medico o il 112 in caso di febbre >= 38 °C, difficoltà respiratoria o reazione allergica.',
      conservazione: body.conservazione
        ? String(body.conservazione)
        : 'Conservare nella confezione originale al riparo da calore e umidità.',
      fonte_aifa_url: body.fonte_aifa_url ? String(body.fonte_aifa_url) : 'https://www.aifa.gov.it/',
    });
    if (!created) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.status(201).json({ medication: created });
  });

  // Add appointment
  app.post('/api/patients/:code/appointments', (req, res) => {
    const body = req.body ?? {};
    if (!body.tipo || !body.data_ora) {
      res.status(400).json({ error: 'Tipo e data/ora appuntamento obbligatori.' });
      return;
    }
    const created = addAppointment({
      codice_paziente: req.params.code,
      data_ora: String(body.data_ora),
      durata_minuti: Number(body.durata_minuti ?? 45),
      tipo: String(body.tipo),
      medico_responsabile: String(
        body.medico_responsabile ?? 'Dr.ssa Elena Bianchi'
      ),
      struttura: String(
        body.struttura ?? 'Istituto Oncologico San Marco — Ambulatorio Oncologia'
      ),
      indirizzo_struttura: body.indirizzo_struttura
        ? String(body.indirizzo_struttura)
        : undefined,
      telefono_struttura: body.telefono_struttura
        ? String(body.telefono_struttura)
        : undefined,
      indicazioni_accesso: body.indicazioni_accesso
        ? String(body.indicazioni_accesso)
        : undefined,
      trattamento_previsto: String(
        body.trattamento_previsto ?? 'Controllo clinico programmato'
      ),
      preparazione: body.preparazione ? String(body.preparazione) : undefined,
      cosa_portare: Array.isArray(body.cosa_portare)
        ? body.cosa_portare.map(String)
        : undefined,
    });
    if (!created) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.status(201).json({ appointment: created });
  });

  // Add a booking reminder
  app.post('/api/patients/:code/booking-reminders', (req, res) => {
    const body = req.body ?? {};
    const patient = getPatientByCode(req.params.code);
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    if (!body.titolo || !String(body.titolo).trim()) {
      res.status(400).json({ error: 'Il titolo del promemoria è obbligatorio.' });
      return;
    }
    const created = addBookingReminder({
      codice_paziente: patient.codice,
      titolo: String(body.titolo).trim(),
      specialita: String(body.specialita ?? 'Oncologia'),
      scadenza_consigliata: String(
        body.scadenza_consigliata ?? new Date(Date.now() + 7 * 86400 * 1000).toISOString()
      ),
      struttura_suggerita: String(
        body.struttura_suggerita ?? patient.struttura_riferimento
      ),
      indirizzo_struttura: String(
        body.indirizzo_struttura ?? 'Via San Marco 18, 20121 Milano'
      ),
      telefono_cup: String(body.telefono_cup ?? patient.telefono_struttura),
      medico_suggerito: String(body.medico_suggerito ?? patient.medico_curante),
      documenti_richiesti: Array.isArray(body.documenti_richiesti)
        ? body.documenti_richiesti.map(String)
        : ['Impegnativa medica', 'Esenzione 048', 'Tessera sanitaria'],
      istruzioni_prenotazione: String(
        body.istruzioni_prenotazione ??
          'Contattare il CUP o la segreteria del reparto indicando il percorso oncologico attivo.'
      ),
      preparazione_richiesta: String(
        body.preparazione_richiesta ?? 'Verificare eventuali indicazioni al momento della conferma CUP.'
      ),
      cosa_portare: Array.isArray(body.cosa_portare)
        ? body.cosa_portare.map(String)
        : ['Tessera sanitaria', 'Impegnativa medica', 'Referti recenti'],
      urgenza: body.urgenza === 'prioritaria' ? 'prioritaria' : 'ordinaria',
    });
    res.status(201).json({ reminder: created });
  });

  // Guided booking confirmation -> creates appointment and marks reminder as booked
  app.post('/api/patients/:code/book-visit', (req, res) => {
    const body = req.body ?? {};
    if (!body.tipo || !String(body.tipo).trim() || !body.data_ora) {
      res.status(400).json({
        error: 'Tipo di visita e data/ora confermata sono obbligatori.',
      });
      return;
    }
    const result = bookAppointment({
      codice_paziente: req.params.code,
      reminderId: body.reminderId ? String(body.reminderId) : undefined,
      data_ora: String(body.data_ora),
      durata_minuti: body.durata_minuti ? Number(body.durata_minuti) : 40,
      tipo: String(body.tipo),
      medico_responsabile: String(body.medico_responsabile ?? ''),
      struttura: String(body.struttura ?? ''),
      indirizzo_struttura: body.indirizzo_struttura
        ? String(body.indirizzo_struttura)
        : undefined,
      telefono_struttura: body.telefono_struttura
        ? String(body.telefono_struttura)
        : undefined,
      indicazioni_accesso: body.indicazioni_accesso
        ? String(body.indicazioni_accesso)
        : undefined,
      trattamento_previsto: body.trattamento_previsto
        ? String(body.trattamento_previsto)
        : undefined,
      preparazione: body.preparazione ? String(body.preparazione) : undefined,
      cosa_portare: Array.isArray(body.cosa_portare)
        ? body.cosa_portare.map(String)
        : undefined,
    });
    if (!result) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    res.status(201).json(result);
  });

  // Emergency / Call Doctor action from Patient Top Bar
  app.post('/api/patients/:code/emergency', (req, res) => {
    const { tipo, nota } = req.body ?? {};
    const patient = getPatientByCode(req.params.code);
    if (!patient) {
      res.status(404).json({ error: 'Paziente non trovato.' });
      return;
    }
    const is112 = tipo === '112';
    const urgenza: UrgencyLevel = is112 ? 'emergenza' : 'alta';
    const locationNote =
      is112 && patient.consenso_geolocalizzazione
        ? ` Posizione autorizzata: ${patient.posizione_simulata.indirizzo}.`
        : '';

    const alert = createDoctorAlert({
      codice_paziente: patient.codice,
      livello_urgenza: urgenza,
      titolo: is112
        ? 'ALLARME 112 attivato dal paziente'
        : 'Richiesta contatto telefonico urgente al Medico',
      motivo: `${
        is112
          ? 'Il paziente ha premuto il pulsante di emergenza Chiama 112 nell’interfaccia paziente.'
          : 'Il paziente ha premuto il pulsante Chiama Medico nella barra superiore.'
      }${nota ? ` Nota: ${String(nota)}` : ''}${locationNote}`,
      azione_consigliata: is112
        ? 'Verificare immediatamente le condizioni del paziente e coordinarsi con i soccorsi / Pronto Soccorso.'
        : 'Contattare telefonicamente il paziente appena possibile.',
      canale_origine: 'emergenza_pulsante',
    });

    res.status(201).json({ alert });
  });

  // --- Doctor Portal APIs ---

  app.get('/api/doctor/:doctorId/workspace', (req, res) => {
    const doctorId = req.params.doctorId;
    const doctor = getDoctors().find((d) => d.id === doctorId);
    if (!doctor) {
      res.status(404).json({ error: 'Professionista sanitario non trovato.' });
      return;
    }

    const patientsRoster = getAllPatientsForDoctorList(doctorId);
    const enrichedRoster = patientsRoster.map((item) => ({
      ...item,
      symptoms: item.authorizedDiary ? getSymptoms(item.codice) : [],
      medications: item.authorizedFolder ? getMedications(item.codice) : [],
      appointments: item.authorizedFolder ? getAppointments(item.codice) : [],
    }));

    const alerts = getAlertsForDoctor(doctorId);

    res.json({
      doctor,
      patients: enrichedRoster,
      alerts,
    });
  });

  app.post('/api/doctor/:doctorId/request-consent/:code', (req, res) => {
    const rawScope = req.body?.ambito;
    const scope: 'cartella' | 'diario' | 'entrambi' =
      rawScope === 'cartella' || rawScope === 'diario' || rawScope === 'entrambi'
        ? rawScope
        : 'entrambi';
    const ok = requestDoctorConsent(req.params.code, req.params.doctorId, scope);
    if (!ok) {
      res.status(404).json({ error: 'Paziente o medico non trovato.' });
      return;
    }
    res.json({ ok: true, ambito: scope });
  });

  app.post('/api/doctor/:doctorId/alerts/:alertId/respond', (req, res) => {
    const doctor = getDoctors().find((d) => d.id === req.params.doctorId);
    if (!doctor) {
      res.status(404).json({ error: 'Medico non trovato.' });
      return;
    }
    const { testo, canale, markResolved } = req.body ?? {};
    if (!testo || typeof testo !== 'string' || !testo.trim()) {
      res.status(400).json({ error: 'Il testo della risposta è obbligatorio.' });
      return;
    }
    const updated = respondToAlert({
      alertId: req.params.alertId,
      doctorName: doctor.nome,
      testo,
      canale: canale ?? 'OncoCare',
      markResolved: Boolean(markResolved),
    });
    if (!updated) {
      res.status(404).json({ error: 'Segnalazione non trovata.' });
      return;
    }
    res.json({ alert: updated });
  });

  // --- OncoCare AI Chat Endpoint ---
  app.post('/api/agent/chat', async (req, res) => {
    try {
      const { history, message } = req.body ?? {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Messaggio vuoto.' });
        return;
      }
      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (h: unknown): h is { role: 'user' | 'assistant'; text: string } =>
                Boolean(
                  h &&
                    typeof h === 'object' &&
                    'text' in h &&
                    typeof (h as { text: unknown }).text === 'string'
                )
            )
            .slice(-20)
        : [];

      const result = await runOncoCareAgent({
        history: safeHistory,
        message: message.trim(),
      });
      res.json(result);
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number; status?: number };
      console.error('[OncoCare Agent Error]', e);
      const status = e.statusCode ?? e.status ?? 500;
      res.status(status).json({
        error:
          e.message ||
          'Errore durante la comunicazione con OncoCare AI. Verifica la chiave GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  // --- Vite / Static Frontend ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OncoCare AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start OncoCare AI server:', err);
  process.exit(1);
});
