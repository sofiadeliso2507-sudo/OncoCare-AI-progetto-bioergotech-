import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDoctorAccessClinicalData,
  canDoctorAccessSymptomDiary,
  canMarkDoseAsAssunta,
  classifyDoseStatus,
  evaluateSymptomAlert,
  formatUtcToRome,
  getRomeDateParts,
  isSameRomeDay,
  normalizeIntensity,
} from './clinicalLogic.ts';

test('getRomeDateParts converts UTC to Europe/Rome CET (+1 in November)', () => {
  // 2026-11-24T09:00:00Z in winter CET (+1) is 10:00 in Rome (Tuesday = martedì)
  const utcDate = new Date('2026-11-24T09:00:00Z');
  const parts = getRomeDateParts(utcDate);
  assert.equal(parts.dateKey, '2026-11-24');
  assert.equal(parts.timeStr, '10:00');
  assert.equal(parts.dayOfWeek, 'martedì');
});

test('formatUtcToRome shows weekday only for today and omits weekday for other days', () => {
  const refNow = new Date('2026-11-24T09:00:00Z'); // 10:00 Rome, martedì 24 novembre
  const todayStr = formatUtcToRome('2026-11-24T13:30:00Z', refNow);
  assert.match(todayStr, /oggi \(martedì 24 novembre\) alle 14:30/);

  const futureStr = formatUtcToRome('2026-11-27T09:30:00Z', refNow);
  assert.equal(futureStr, '27 novembre alle 10:30');
  assert.ok(!futureStr.includes('venerdì'));
});

test('isSameRomeDay handles late-night UTC boundary into next Rome day', () => {
  // 2026-11-24T23:30:00Z is 2026-11-25 00:30 in Europe/Rome!
  const lateUtc = '2026-11-24T23:30:00Z';
  const nov24RomeNoon = new Date('2026-11-24T11:00:00Z');
  const nov25RomeNoon = new Date('2026-11-25T11:00:00Z');
  assert.equal(isSameRomeDay(lateUtc, nov24RomeNoon), false);
  assert.equal(isSameRomeDay(lateUtc, nov25RomeNoon), true);
});

test('classifyDoseStatus and canMarkDoseAsAssunta strictly block future or already taken doses', () => {
  const refNow = new Date('2026-11-24T10:00:00Z'); // 11:00 Rome

  const taken = { stato: 'assunta' as const, orario_previsto: '2026-11-24T07:00:00Z' };
  assert.equal(classifyDoseStatus(taken, refNow), 'assunta');
  assert.equal(canMarkDoseAsAssunta(taken, refNow).allowed, false);

  const dueNow = { stato: 'da_assumere' as const, orario_previsto: '2026-11-24T09:00:00Z' };
  assert.equal(classifyDoseStatus(dueNow, refNow), 'da_assumere_ora');
  assert.equal(canMarkDoseAsAssunta(dueNow, refNow).allowed, true);

  const future = { stato: 'da_assumere' as const, orario_previsto: '2026-11-24T19:00:00Z' }; // 20:00 Rome
  assert.equal(classifyDoseStatus(future, refNow), 'bloccata');
  const res = canMarkDoseAsAssunta(future, refNow);
  assert.equal(res.allowed, false);
  assert.match(res.reason ?? '', /20:00/);
});

test('evaluateSymptomAlert detects fever >= 38, intensity >= 7, worsening >= 3, and unexpected symptoms', () => {
  const patient = {
    terapia_attuale: 'Capecitabina 1500mg',
    tossicita_attese: ['nausea', 'stanchezza', 'sindrome mano-piede'],
    note_cliniche: 'Monitorare temperatura corporea.',
  };

  // Mild expected symptom -> no alert
  const mild = evaluateSymptomAlert(
    { sintomo: 'Nausea', intensita: 3, descrizione: 'Lieve dopo colazione', categoria: 'fisico' },
    [],
    patient
  );
  assert.equal(mild.requiresDoctorAlert, false);
  assert.equal(mild.isEmergency, false);

  // Worsening >= 3 points -> triggers alert
  const worsening = evaluateSymptomAlert(
    { sintomo: 'Nausea', intensita: 6, descrizione: 'Molto aumentata oggi', categoria: 'fisico' },
    [
      {
        id: 's1',
        codice_paziente: 'PZ001',
        data_ora: '2026-11-23T09:00:00Z',
        categoria: 'fisico',
        sintomo: 'Nausea',
        intensita: 3,
        descrizione: 'Lieve',
        fonte: 'diario',
      },
    ],
    patient
  );
  assert.equal(worsening.requiresDoctorAlert, true);
  assert.equal(worsening.recommendedUrgency, 'alta');

  // Fever 38.5 -> triggers emergency
  const fever = evaluateSymptomAlert(
    { sintomo: 'Febbre', intensita: 7, descrizione: 'Febbre a 38.5 da due ore', categoria: 'fisico' },
    [],
    patient
  );
  assert.equal(fever.isEmergency, true);
  assert.equal(fever.recommendedUrgency, 'emergenza');
});

test('canDoctorAccessClinicalData requires both global clinical consent and specific doctor check', () => {
  assert.equal(
    canDoctorAccessClinicalData(
      { consenso_dati_clinici: true, consensi_medici: { DOC01: true, DOC02: false } },
      'DOC01'
    ),
    true
  );
  assert.equal(
    canDoctorAccessClinicalData(
      { consenso_dati_clinici: true, consensi_medici: { DOC01: true, DOC02: false } },
      'DOC02'
    ),
    false
  );
  assert.equal(
    canDoctorAccessClinicalData(
      { consenso_dati_clinici: false, consensi_medici: { DOC01: true } },
      'DOC01'
    ),
    false
  );
});

test('canDoctorAccessSymptomDiary enforces independent consent for symptom diary', () => {
  assert.equal(
    canDoctorAccessSymptomDiary(
      { consenso_diario_sintomi: true, consensi_diario_medici: { DOC01: true, DOC02: false } },
      'DOC01'
    ),
    true
  );
  assert.equal(
    canDoctorAccessSymptomDiary(
      { consenso_diario_sintomi: true, consensi_diario_medici: { DOC01: false } },
      'DOC01'
    ),
    false
  );
  assert.equal(
    canDoctorAccessSymptomDiary(
      { consenso_diario_sintomi: false, consensi_diario_medici: { DOC01: true } },
      'DOC01'
    ),
    false
  );
});

test('normalizeIntensity preserves -1 when unspecified and clamps 0..10', () => {
  assert.equal(normalizeIntensity(undefined), -1);
  assert.equal(normalizeIntensity(-1), -1);
  assert.equal(normalizeIntensity(15), 10);
  assert.equal(normalizeIntensity(6.6), 7);
});
