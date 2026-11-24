import type {
  AppointmentItem,
  BookingReminderItem,
  DirectMessage,
  DoctorAlert,
  DoctorProfile,
  MedicationScheduleItem,
  PatientProfile,
  SymptomEntry,
} from '../types/onco';

/**
 * Generates a UTC ISO string offset from today at a specific Europe/Rome local hour/minute.
 */
function romeOffsetIso(dayOffset: number, romeHour: number, romeMinute: number): string {
  const now = new Date();
  const base = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const romeStr = base.toLocaleString('en-US', { timeZone: 'Europe/Rome' });
  const utcStr = base.toLocaleString('en-US', { timeZone: 'UTC' });
  const offsetMs = new Date(romeStr).getTime() - new Date(utcStr).getTime();

  const romeParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
  const [y, m, d] = romeParts.split('-').map(Number);

  const targetUtcMs = Date.UTC(y, m - 1, d, romeHour, romeMinute, 0, 0) - offsetMs;
  return new Date(targetUtcMs).toISOString();
}

function relativeMinutesIso(deltaMinutes: number): string {
  const d = new Date(Date.now() + deltaMinutes * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString();
}

export function createSeedDoctors(): DoctorProfile[] {
  return [
    {
      id: 'DOC01',
      nome: 'Dr.ssa Elena Bianchi',
      specializzazione: 'Oncologia Medica',
      struttura: 'Istituto Oncologico San Marco — Milano',
      email: 'e.bianchi@ospedalesanmarco.it',
      telefono: '+39 02 5550 1420',
      avatar: '/src/assets/images/avatar_dr_bianchi_1795538684486.jpg',
    },
    {
      id: 'DOC02',
      nome: 'Dr. Marco Conti',
      specializzazione: 'Genetica Oncologica e Farmacogenomica',
      struttura: 'Istituto Oncologico San Marco — Milano',
      email: 'm.conti@ospedalesanmarco.it',
      telefono: '+39 02 5550 1488',
    },
    {
      id: 'DOC03',
      nome: 'Dr.ssa Laura Neri',
      specializzazione: 'Cure Palliative e Terapia del Dolore',
      struttura: 'Ospedale Maggiore — Reparto Oncologia',
      email: 'l.neri@ospedalemaggiore.it',
      telefono: '+39 02 5550 1905',
    },
  ];
}

export function createSeedPatients(): PatientProfile[] {
  return [
    {
      codice: 'PZ001',
      nome: 'Maria',
      cognome: 'Rossi',
      data_nascita: '1968-04-14',
      avatar: '/src/assets/images/avatar_maria_rossi_1795538684414.jpg',
      diagnosi: 'Carcinoma mammario duttale infiltrante (ER+/HER2-, stadio IIB)',
      stadio_percorso: 'Terapia adiuvante orale · Ciclo 3',
      terapia_attuale: 'Capecitabina 1500 mg (2x/die) + Letrozolo 2,5 mg (1x/die)',
      tossicita_attese: [
        'nausea',
        'stanchezza',
        'astenia',
        'sindrome mano-piede',
        'secchezza cutanea',
        'dolori articolari',
      ],
      allergie: ['Penicillina (orticaria)', 'Mezzo di contrasto iodato (lieve)'],
      note_cliniche:
        'Assumere Capecitabina entro 30 minuti dopo i pasti. Segnalare subito febbre >= 38 °C, diarrea >= 4 scariche/die o arrossamento/dolore intenso a mani e piedi.',
      medico_curante_id: 'DOC01',
      medico_curante: 'Dr.ssa Elena Bianchi',
      struttura_riferimento: 'Istituto Oncologico San Marco — Day Hospital Oncologico (Pad. B)',
      telefono_struttura: '+39 02 5550 1400',
      contatto_emergenza: {
        nome: 'Luca Rossi',
        relazione: 'Marito',
        telefono: '+39 338 441 9021',
      },
      consenso_dati_clinici: true,
      consenso_diario_sintomi: true,
      consenso_geolocalizzazione: true,
      posizione_simulata: {
        citta: 'Milano',
        indirizzo: 'Via Giorgio Washington 48, 20146 Milano (MI)',
        lat: 45.4628,
        lng: 9.1564,
      },
      consensi_medici: {
        DOC01: true,
        DOC02: true,
        DOC03: false,
      },
      consensi_diario_medici: {
        DOC01: true,
        DOC02: true,
        DOC03: false,
      },
      richieste_consenso_pendenti: [],
      profilo_farmacogenomico: [
        {
          id: 'PGX01',
          gene: 'DPYD',
          allele: '*1/*1 (Wild-Type)',
          fenotipo: 'Metabolizzatore normale della diidropirimidina deidrogenasi',
          farmaco_correlato: 'Capecitabina / 5-Fluorouracile',
          rischio_tossicita: 'basso',
          efficacia_prevista: 'Risposta terapeutica standard attesa a dosaggio pieno.',
          raccomandazione_pharmgkb:
            'Nessuna riduzione preventiva della dose richiesta secondo le linee guida CPIC/PharmGKB.',
          fonte_url: 'https://www.pharmgkb.org/gene/PA145',
        },
        {
          id: 'PGX02',
          gene: 'CYP2D6',
          allele: '*1/*4',
          fenotipo: 'Metabolizzatore intermedio',
          farmaco_correlato: 'Tamoxifene (alternativa terapeutica)',
          rischio_tossicita: 'moderato',
          efficacia_prevista:
            'Conversione parzialmente ridotta a endoxifene; attuale terapia con Letrozolo non influenzata.',
          raccomandazione_pharmgkb:
            'Preferire inibitori dell’aromatasi (es. Letrozolo) o valutare aggiustamento in caso di switch.',
          fonte_url: 'https://www.pharmgkb.org/gene/PA128',
        },
      ],
    },
    {
      codice: 'PZ002',
      nome: 'Giuseppe',
      cognome: 'Verdi',
      data_nascita: '1960-09-22',
      avatar: '/src/assets/images/avatar_giuseppe_verdi_1795538683414.jpg',
      diagnosi: 'Adenocarcinoma del colon discendente (stadio III, KRAS wild-type)',
      stadio_percorso: 'Chemioterapia sistemica · Ciclo 4',
      terapia_attuale: 'Capecitabina 1000 mg (2x/die) + Irinotecano EV ogni 21 giorni',
      tossicita_attese: [
        'diarrea lieve',
        'nausea',
        'stanchezza',
        'inappetenza',
        'alopecia lieve',
      ],
      allergie: ['Nessuna allergia farmacologica nota'],
      note_cliniche:
        'Idratazione abbondante (almeno 2L/die). Contattare il medico se diarrea > 3 scariche/die nelle 24h o febbre >= 38 °C. Portare emocromo recente alla prossima infusione.',
      medico_curante_id: 'DOC01',
      medico_curante: 'Dr.ssa Elena Bianchi',
      struttura_riferimento: 'Istituto Oncologico San Marco — Oncologia Gastroenterologica',
      telefono_struttura: '+39 02 5550 1410',
      contatto_emergenza: {
        nome: 'Chiara Verdi',
        relazione: 'Figlia',
        telefono: '+39 347 882 1194',
      },
      consenso_dati_clinici: true,
      consenso_diario_sintomi: true,
      consenso_geolocalizzazione: false,
      posizione_simulata: {
        citta: 'Monza',
        indirizzo: 'Viale Cesare Battisti 19, 20900 Monza (MB)',
        lat: 45.5845,
        lng: 9.2744,
      },
      consensi_medici: {
        DOC01: true,
        DOC02: false,
        DOC03: false,
      },
      consensi_diario_medici: {
        DOC01: true,
        DOC02: false,
        DOC03: false,
      },
      richieste_consenso_pendenti: [
        {
          doctorId: 'DOC02',
          doctorName: 'Dr. Marco Conti',
          ambito: 'entrambi',
          richiestaIl: romeOffsetIso(-1, 15, 20),
        },
      ],
      profilo_farmacogenomico: [
        {
          id: 'PGX03',
          gene: 'UGT1A1',
          allele: '*1/*28',
          fenotipo: 'Metabolizzatore intermedio (eterozigote *28)',
          farmaco_correlato: 'Irinotecano',
          rischio_tossicita: 'moderato',
          efficacia_prevista: 'Efficacia mantenuta con monitoraggio ematologico ravvicinato.',
          raccomandazione_pharmgkb:
            'Monitorare attentamente neutropenia e diarrea tardiva; considerare riduzione posologica in caso di tossicità grado ≥ 2.',
          fonte_url: 'https://www.pharmgkb.org/gene/PA420',
        },
      ],
    },
    {
      codice: 'PZ003',
      nome: 'Elena',
      cognome: 'Ferrari',
      data_nascita: '1975-06-11',
      avatar: '/src/assets/images/avatar_elena_ferrari_1795542392064.jpg',
      diagnosi: 'Carcinoma sieroso ovarico ad alto grado (mutazione BRCA1 patogenetica)',
      stadio_percorso: 'Terapia di mantenimento con PARP-inibitore · Mese 5',
      terapia_attuale: 'Olaparib 300 mg (2x/die)',
      tossicita_attese: ['anemia lieve', 'nausea', 'astenia', 'disgeusia'],
      allergie: ['Sulfamidici (rash cutaneo)'],
      note_cliniche:
        'Evitare pompelmo e succo di pompelmo (inibitore CYP3A4). Eseguire emocromo mensile. Segnalare subito dispnea, capogiri intensi o febbre >= 38 °C.',
      medico_curante_id: 'DOC01',
      medico_curante: 'Dr.ssa Elena Bianchi',
      struttura_riferimento: 'Istituto Oncologico San Marco — Ginecologia Oncologica',
      telefono_struttura: '+39 02 5550 1445',
      contatto_emergenza: {
        nome: 'Paolo Ferrari',
        relazione: 'Fratello',
        telefono: '+39 339 712 4580',
      },
      consenso_dati_clinici: true,
      consenso_diario_sintomi: true,
      consenso_geolocalizzazione: true,
      posizione_simulata: {
        citta: 'Milano',
        indirizzo: 'Corso XXII Marzo 27, 20129 Milano (MI)',
        lat: 45.4612,
        lng: 9.2108,
      },
      consensi_medici: {
        DOC01: true,
        DOC02: true,
        DOC03: false,
      },
      consensi_diario_medici: {
        DOC01: true,
        DOC02: true,
        DOC03: false,
      },
      richieste_consenso_pendenti: [],
      profilo_farmacogenomico: [
        {
          id: 'PGX04',
          gene: 'BRCA1 / CYP3A4',
          allele: 'BRCA1 c.5266dupC · CYP3A4 *1/*1',
          fenotipo: 'Sensibilità elevata a PARP-inibitori; metabolismo CYP3A4 normale',
          farmaco_correlato: 'Olaparib',
          rischio_tossicita: 'basso',
          efficacia_prevista: 'Alta sensibilità attesa alla terapia di mantenimento.',
          raccomandazione_pharmgkb:
            'Evitare co-somministrazione di forti inibitori o induttori di CYP3A4.',
          fonte_url: 'https://www.pharmgkb.org/chemical/PA166122423',
        },
      ],
    },
    {
      codice: 'PZ004',
      nome: 'Marco',
      cognome: 'Esposito',
      data_nascita: '1964-11-03',
      avatar: '/src/assets/images/avatar_marco_esposito_1795542391709.jpg',
      diagnosi: 'Adenocarcinoma polmonare non a piccole cellule (EGFR del19+)',
      stadio_percorso: 'Terapia target orale · Mese 8',
      terapia_attuale: 'Osimertinib 80 mg (1x/die)',
      tossicita_attese: [
        'rash acneiforme',
        'secchezza cutanea',
        'paronichia',
        'diarrea lieve',
        'stomatite',
      ],
      allergie: ['Nessuna allergia farmacologica nota'],
      note_cliniche:
        'Monitorare eventuali sintomi respiratori nuovi (tosse secca persistente, affanno progressivo) o palpitazioni. Applicare crema emolliente quotidiana.',
      medico_curante_id: 'DOC01',
      medico_curante: 'Dr.ssa Elena Bianchi',
      struttura_riferimento: 'Istituto Oncologico San Marco — Oncologia Toracica',
      telefono_struttura: '+39 02 5550 1460',
      contatto_emergenza: {
        nome: 'Anna Esposito',
        relazione: 'Moglie',
        telefono: '+39 348 290 6611',
      },
      consenso_dati_clinici: true,
      consenso_diario_sintomi: true,
      consenso_geolocalizzazione: true,
      posizione_simulata: {
        citta: 'Bergamo',
        indirizzo: 'Via XX Settembre 84, 24122 Bergamo (BG)',
        lat: 45.6946,
        lng: 9.6695,
      },
      consensi_medici: {
        DOC01: true,
        DOC02: false,
        DOC03: true,
      },
      // Example where DOC01 can read clinical folder, but patient restricted Symptom Diary to DOC03 only!
      consensi_diario_medici: {
        DOC01: false,
        DOC02: false,
        DOC03: true,
      },
      richieste_consenso_pendenti: [],
      profilo_farmacogenomico: [
        {
          id: 'PGX05',
          gene: 'CYP3A5',
          allele: '*3/*3',
          fenotipo: 'Non espressore CYP3A5',
          farmaco_correlato: 'Osimertinib',
          rischio_tossicita: 'basso',
          efficacia_prevista: 'Esposizione plasmatica stabile al dosaggio standard di 80 mg/die.',
          raccomandazione_pharmgkb:
            'Monitoraggio clinico standard ed ECG periodico per intervallo QTc.',
          fonte_url: 'https://www.pharmgkb.org/chemical/PA166155693',
        },
      ],
    },
    {
      codice: 'PZ005',
      nome: 'Sofia',
      cognome: 'Conti',
      data_nascita: '1981-02-19',
      avatar: '/src/assets/images/avatar_sofia_conti_1795542392431.jpg',
      diagnosi: 'Melanoma cutaneo stadio IIIC (mutazione BRAF V600E)',
      stadio_percorso: 'Terapia target adiuvante · Ciclo 2',
      terapia_attuale: 'Dabrafenib 150 mg (2x/die) + Trametinib 2 mg (1x/die)',
      tossicita_attese: ['piressia lieve', 'brividi', 'artralgie', 'stanchezza', 'rash'],
      allergie: ['Ibuprofene (broncospasmo lieve)'],
      note_cliniche:
        'Assumere Dabrafenib almeno 1 ora prima o 2 ore dopo i pasti. Segnalare subito febbre >= 38 °C o alterazioni della vista.',
      medico_curante_id: 'DOC01',
      medico_curante: 'Dr.ssa Elena Bianchi',
      struttura_riferimento: 'Istituto Oncologico San Marco — Melanoma Unit',
      telefono_struttura: '+39 02 5550 1472',
      contatto_emergenza: {
        nome: 'Matteo Conti',
        relazione: 'Marito',
        telefono: '+39 340 518 7732',
      },
      consenso_dati_clinici: false,
      consenso_diario_sintomi: true,
      consenso_geolocalizzazione: false,
      posizione_simulata: {
        citta: 'Brescia',
        indirizzo: 'Via Solferino 32, 25121 Brescia (BS)',
        lat: 45.5356,
        lng: 10.2202,
      },
      consensi_medici: {
        DOC01: false,
        DOC02: true,
        DOC03: false,
      },
      consensi_diario_medici: {
        DOC01: true,
        DOC02: true,
        DOC03: false,
      },
      richieste_consenso_pendenti: [],
      profilo_farmacogenomico: [
        {
          id: 'PGX06',
          gene: 'G6PD',
          allele: 'B/B (Normale)',
          fenotipo: 'Attività enzimatica G6PD nella norma',
          farmaco_correlato: 'Dabrafenib',
          rischio_tossicita: 'basso',
          efficacia_prevista: 'Nessun rischio aumentato di anemia emolitica da Dabrafenib.',
          raccomandazione_pharmgkb:
            'Terapia sicura dal punto di vista del deficit di G6PD.',
          fonte_url: 'https://www.pharmgkb.org/chemical/PA166109551',
        },
      ],
    },
  ];
}

export function createSeedSymptoms(): SymptomEntry[] {
  return [
    {
      id: 'SYM001',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(-3, 18, 15),
      categoria: 'fisico',
      sintomo: 'Stanchezza',
      intensita: 4,
      descrizione: 'Affaticamento lieve nel tardo pomeriggio dopo le faccende domestiche.',
      fonte: 'diario',
    },
    {
      id: 'SYM002',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(-2, 10, 30),
      categoria: 'fisico',
      sintomo: 'Nausea',
      intensita: 3,
      descrizione: 'Lieve nausea mattutina durata circa 40 minuti dopo la colazione.',
      fonte: 'diario',
    },
    {
      id: 'SYM003',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(-1, 20, 10),
      categoria: 'psicologico',
      sintomo: 'Ansia lieve pre-controllo',
      intensita: 4,
      descrizione: 'Preoccupazione moderata in vista degli esami ematici della prossima settimana.',
      fonte: 'diario',
    },
    {
      id: 'SYM004',
      codice_paziente: 'PZ002',
      data_ora: romeOffsetIso(-2, 14, 0),
      categoria: 'fisico',
      sintomo: 'Diarrea lieve',
      intensita: 3,
      descrizione: 'Due scariche morbide nel pomeriggio, nessuna febbre associata.',
      fonte: 'diario',
    },
    {
      id: 'SYM005',
      codice_paziente: 'PZ002',
      data_ora: romeOffsetIso(-1, 16, 45),
      categoria: 'fisico',
      sintomo: 'Stanchezza',
      intensita: 5,
      descrizione: 'Spossatezza moderata dopo il pranzo.',
      fonte: 'diario',
    },
    {
      id: 'SYM006',
      codice_paziente: 'PZ003',
      data_ora: romeOffsetIso(-2, 11, 10),
      categoria: 'fisico',
      sintomo: 'Disgeusia',
      intensita: 3,
      descrizione: 'Sapore metallico lieve ai pasti principali.',
      fonte: 'diario',
    },
    {
      id: 'SYM007',
      codice_paziente: 'PZ003',
      data_ora: romeOffsetIso(-1, 17, 30),
      categoria: 'fisico',
      sintomo: 'Astenia',
      intensita: 4,
      descrizione: 'Affaticamento serale controllabile con riposo.',
      fonte: 'diario',
    },
    {
      id: 'SYM008',
      codice_paziente: 'PZ004',
      data_ora: romeOffsetIso(-1, 12, 20),
      categoria: 'fisico',
      sintomo: 'Secchezza cutanea',
      intensita: 4,
      descrizione: 'Pelle secca su mani e viso, applicata crema idratante.',
      fonte: 'diario',
    },
    {
      id: 'SYM009',
      codice_paziente: 'PZ005',
      data_ora: romeOffsetIso(-1, 19, 0),
      categoria: 'fisico',
      sintomo: 'Artralgia',
      intensita: 4,
      descrizione: 'Dolore articolare lieve alle ginocchia a fine giornata.',
      fonte: 'diario',
    },
  ];
}

type LeafletMeta = Pick<
  MedicationScheduleItem,
  | 'indicazioni_terapeutiche'
  | 'interazioni'
  | 'effetti_indesiderati'
  | 'avvertenze_urgenti'
  | 'conservazione'
  | 'fonte_aifa_url'
>;

const DRUG_LEAFLETS: Record<string, LeafletMeta> = {
  Capecitabina: {
    indicazioni_terapeutiche:
      'Antineoplastico orale appartenente alle fluoropirimidine, impiegato nel trattamento adiuvante e sistemico di neoplasie mammarie e colorettali.',
    interazioni:
      'Evitare integratori ad alto dosaggio di acido folico/vitamine non concordati; segnalare sempre l’uso concomitante di warfarin/anticoagulanti orali, fenitoina o allopurinolo.',
    effetti_indesiderati: [
      'Sindrome mano-piede (arrossamento, formicolio o dolore a palmi e piante)',
      'Nausea lieve, perdita di appetito o alterazione del gusto',
      'Diarrea o stomatite (afte del cavo orale)',
      'Stanchezza e riduzione transitoria dei globuli bianchi',
    ],
    avvertenze_urgenti:
      'Sospendere momentaneamente la dose successiva e contattare subito il medico (o il 112 in caso di malessere acuto) se compaiono febbre ≥ 38 °C, diarrea ≥ 4 scariche/die, vomito incoercibile, dolore toracico o desquamazione dolorosa di mani/piedi.',
    conservazione:
      'Conservare nella confezione originale a temperatura inferiore a 30 °C, lontano da umidità e portata dei bambini.',
    fonte_aifa_url: 'https://www.ema.europa.eu/en/medicines/human/EPAR/xeloda',
  },
  Letrozolo: {
    indicazioni_terapeutiche:
      'Inibitore non steroideo dell’aromatasi indicato nella terapia ormonale adiuvante del carcinoma mammario positivo ai recettori ormonali.',
    interazioni:
      'Non assumere insieme a tamoxifene o terapie contenenti estrogeni; informare il medico prima di iniziare integratori a base di fitoestrogeni.',
    effetti_indesiderati: [
      'Vampate di calore e sudorazione notturna',
      'Dolori articolari o rigidità muscolare mattutina',
      'Affaticamento lieve o cefalea occasionale',
    ],
    avvertenze_urgenti:
      'Segnalare al medico dolori ossei persistenti o gonfiore improvviso a un arto.',
    conservazione:
      'Conservare a temperatura ambiente (< 25 °C) nel blister originale.',
    fonte_aifa_url: 'https://www.aifa.gov.it/',
  },
  Ondansetron: {
    indicazioni_terapeutiche:
      'Antiemetico selettivo (antagonista 5-HT3) utilizzato per prevenire e trattare nausea e vomito associati a chemioterapia.',
    interazioni:
      'Cautela con farmaci che possono prolungare l’intervallo QTc (es. alcuni antiaritmici, macrolidi) o farmaci serotoninergici.',
    effetti_indesiderati: [
      'Mal di testa lieve',
      'Stitichezza transitoria',
      'Sensazione di calore o arrossamento',
    ],
    avvertenze_urgenti:
      'Contattare subito il medico o il 112 in caso di palpitazioni intense, capogiri improvvisi o reazione allergica.',
    conservazione:
      'Conservare al riparo dalla luce e dall’umidità. Non estrarre la compressa orodispersibile dal blister prima dell’uso.',
    fonte_aifa_url: 'https://www.aifa.gov.it/',
  },
  Olaparib: {
    indicazioni_terapeutiche:
      'Inibitore di PARP indicato come terapia di mantenimento nel carcinoma ovarico con mutazione BRCA.',
    interazioni:
      'Evitare pompelmo, succo di pompelmo e arance di Siviglia; evitare forti inibitori o induttori del CYP3A4 (es. erba di San Giovanni / iperico).',
    effetti_indesiderati: [
      'Anemia lieve-moderata e stanchezza',
      'Nausea o disgeusia (gusto metallico)',
      'Lievi disturbi digestivi',
    ],
    avvertenze_urgenti:
      'Segnalare tempestivamente mancanza di respiro, tosse nuova persistente, febbre ≥ 38 °C o pallore/stanchezza marcata.',
    conservazione:
      'Conservare nella confezione originale per proteggere dall’umidità, sotto i 30 °C.',
    fonte_aifa_url: 'https://www.ema.europa.eu/en/medicines/human/EPAR/lynparza',
  },
  Osimertinib: {
    indicazioni_terapeutiche:
      'Inibitore tirosin-chinasico di terza generazione mirato per carcinoma polmonare non a piccole cellule con mutazione EGFR.',
    interazioni:
      'Evitare iperico (erba di San Giovanni) e forti induttori del CYP3A4; cautela con farmaci che prolungano l’intervallo QTc.',
    effetti_indesiderati: [
      'Secchezza cutanea, rash acneiforme o fragilità ungueale (paronichia)',
      'Diarrea lieve o infiammazione della mucosa orale',
      'Stanchezza moderata',
    ],
    avvertenze_urgenti:
      'Contattare immediatamente il medico o il 112 se compaiono difficoltà respiratoria improvvisa, tosse secca in peggioramento con febbre o palpitazioni importanti.',
    conservazione:
      'Conservare a temperatura ambiente (< 25 °C) nel blister originale.',
    fonte_aifa_url: 'https://www.ema.europa.eu/en/medicines/human/EPAR/tagrisso',
  },
  'Dabrafenib + Trametinib': {
    indicazioni_terapeutiche:
      'Associazione mirata (inibitore BRAF + inibitore MEK) per il trattamento adiuvante del melanoma con mutazione BRAF V600E.',
    interazioni:
      'Assumere rigorosamente lontano dai pasti; evitare pompelmo e forti inibitori/induttori CYP3A4 o CYP2C8.',
    effetti_indesiderati: [
      'Piressia (febbre) e brividi',
      'Dolori articolari e muscolari',
      'Stanchezza, rash cutaneo o lieve nausea',
    ],
    avvertenze_urgenti:
      'In caso di febbre ≥ 38 °C o alterazioni della vista (visione offuscata, aloni), contattare subito il medico prima di assumere la dose successiva.',
    conservazione:
      'Conservare nel flacone chiuso ben asciutto (Dabrafenib a temperatura < 25 °C; verificare etichetta per Trametinib).',
    fonte_aifa_url: 'https://www.ema.europa.eu/en/medicines/human/EPAR/tafinlar',
  },
};

export function createSeedMedications(): MedicationScheduleItem[] {
  const raw: MedicationScheduleItem[] = [
    // PZ001
    {
      id: 'MED001',
      codice_paziente: 'PZ001',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1500 mg',
      quantita: '3 compresse da 500 mg',
      orario_previsto: romeOffsetIso(-1, 8, 30),
      stato: 'assunta',
      assunta_il: romeOffsetIso(-1, 8, 42),
      istruzioni_assunzione: 'Entro 30 minuti dopo la colazione con un bicchiere d’acqua.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera (Piano Terra, Pad. A) con piano terapeutico.',
      controindicazioni: 'Evitare integratori di acido folico non prescritti; segnalare diarrea o dolore toracico.',
    },
    {
      id: 'MED002',
      codice_paziente: 'PZ001',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1500 mg',
      quantita: '3 compresse da 500 mg',
      orario_previsto: romeOffsetIso(-1, 20, 30),
      stato: 'assunta',
      assunta_il: romeOffsetIso(-1, 20, 35),
      istruzioni_assunzione: 'Entro 30 minuti dopo la cena con un bicchiere d’acqua.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera (Piano Terra, Pad. A) con piano terapeutico.',
      controindicazioni: 'Non spezzare le compresse; non raddoppiare la dose in caso di dimenticanza.',
    },
    {
      id: 'MED003',
      codice_paziente: 'PZ001',
      farmaco: 'Letrozolo',
      principio_attivo: 'Letrozolo',
      dosaggio: '2,5 mg',
      quantita: '1 compressa',
      orario_previsto: relativeMinutesIso(-180),
      stato: 'assunta',
      assunta_il: relativeMinutesIso(-170),
      istruzioni_assunzione: 'Una compressa al giorno preferibilmente alla stessa ora, indipendentemente dai pasti.',
      reperibilita: 'Disponibile in farmacia territoriale con ricetta SSN (Fascia A).',
      controindicazioni: 'Riferire dolori ossei persistenti o vampate invalidanti.',
    },
    {
      id: 'MED004',
      codice_paziente: 'PZ001',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1500 mg',
      quantita: '3 compresse da 500 mg',
      orario_previsto: relativeMinutesIso(-45),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Assumere a stomaco pieno (entro 30 minuti dopo il pasto) con acqua.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera (Piano Terra, Pad. A) con piano terapeutico.',
      controindicazioni: 'Non assumere in caso di febbre ≥ 38 °C o diarrea grave; contattare prima il medico.',
    },
    {
      id: 'MED005',
      codice_paziente: 'PZ001',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1500 mg',
      quantita: '3 compresse da 500 mg',
      orario_previsto: relativeMinutesIso(180),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Assumere a stomaco pieno (entro 30 minuti dopo la cena) con acqua.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera (Piano Terra, Pad. A) con piano terapeutico.',
      controindicazioni: 'Dose serale bloccata fino all’orario previsto per prevenire sovradosaggi.',
    },
    {
      id: 'MED006',
      codice_paziente: 'PZ001',
      farmaco: 'Letrozolo',
      principio_attivo: 'Letrozolo',
      dosaggio: '2,5 mg',
      quantita: '1 compressa',
      orario_previsto: romeOffsetIso(1, 8, 30),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Una compressa al mattino.',
      reperibilita: 'Farmacia territoriale con ricetta SSN.',
      controindicazioni: 'Non sospendere autonomamente.',
    },
    {
      id: 'MED007',
      codice_paziente: 'PZ001',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1500 mg',
      quantita: '3 compresse da 500 mg',
      orario_previsto: romeOffsetIso(1, 13, 0),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Entro 30 minuti dal pranzo.',
      reperibilita: 'Farmacia Ospedaliera.',
      controindicazioni: 'Monitorare mani e piedi.',
    },
    // PZ002
    {
      id: 'MED008',
      codice_paziente: 'PZ002',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1000 mg',
      quantita: '2 compresse da 500 mg',
      orario_previsto: relativeMinutesIso(-150),
      stato: 'assunta',
      assunta_il: relativeMinutesIso(-140),
      istruzioni_assunzione: 'Assumere a stomaco pieno dopo la colazione.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera San Marco.',
      controindicazioni: 'Segnalare diarrea > 3 scariche/die.',
    },
    {
      id: 'MED009',
      codice_paziente: 'PZ002',
      farmaco: 'Capecitabina',
      principio_attivo: 'Capecitabina',
      dosaggio: '1000 mg',
      quantita: '2 compresse da 500 mg',
      orario_previsto: relativeMinutesIso(-30),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Assumere entro 30 minuti dal pasto.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera San Marco.',
      controindicazioni: 'Non assumere in caso di febbre o diarrea persistente.',
    },
    {
      id: 'MED010',
      codice_paziente: 'PZ002',
      farmaco: 'Ondansetron',
      principio_attivo: 'Ondansetron',
      dosaggio: '8 mg',
      quantita: '1 compressa orodispersibile',
      orario_previsto: relativeMinutesIso(210),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Sciogliere sulla lingua la sera in caso di nausea persistente.',
      reperibilita: 'Farmacia territoriale con ricetta.',
      controindicazioni: 'Attenzione a prolungamento QT se associato ad altri farmaci.',
    },
    // PZ003 (Elena Ferrari)
    {
      id: 'MED011',
      codice_paziente: 'PZ003',
      farmaco: 'Olaparib',
      principio_attivo: 'Olaparib',
      dosaggio: '300 mg',
      quantita: '2 compresse da 150 mg',
      orario_previsto: relativeMinutesIso(-160),
      stato: 'assunta',
      assunta_il: relativeMinutesIso(-155),
      istruzioni_assunzione: 'Ingerire intere con acqua, con o senza cibo.',
      reperibilita: 'Farmacia Ospedaliera con piano terapeutico AIFA.',
      controindicazioni: 'Evitare pompelmo e arance di Siviglia.',
    },
    {
      id: 'MED012',
      codice_paziente: 'PZ003',
      farmaco: 'Olaparib',
      principio_attivo: 'Olaparib',
      dosaggio: '300 mg',
      quantita: '2 compresse da 150 mg',
      orario_previsto: relativeMinutesIso(200),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Dose serale a distanza di 12 ore dalla mattina.',
      reperibilita: 'Farmacia Ospedaliera con piano terapeutico AIFA.',
      controindicazioni: 'Non assumere doppia dose in caso di dimenticanza.',
    },
    // PZ004 (Marco Esposito)
    {
      id: 'MED013',
      codice_paziente: 'PZ004',
      farmaco: 'Osimertinib',
      principio_attivo: 'Osimertinib',
      dosaggio: '80 mg',
      quantita: '1 compressa',
      orario_previsto: relativeMinutesIso(-25),
      stato: 'da_assumere',
      istruzioni_assunzione: 'Una compressa al giorno alla stessa ora, con o senza cibo.',
      reperibilita: 'Distribuzione diretta Farmacia Ospedaliera.',
      controindicazioni: 'Segnalare subito mancanza di respiro o tosse nuova.',
    },
    // PZ005 (Sofia Conti)
    {
      id: 'MED014',
      codice_paziente: 'PZ005',
      farmaco: 'Dabrafenib + Trametinib',
      principio_attivo: 'Dabrafenib / Trametinib',
      dosaggio: '150 mg + 2 mg',
      quantita: '2 capsule + 1 compressa',
      orario_previsto: relativeMinutesIso(-90),
      stato: 'assunta',
      assunta_il: relativeMinutesIso(-85),
      istruzioni_assunzione: 'A stomaco vuoto (1 ora prima o 2 ore dopo il pasto).',
      reperibilita: 'Farmacia Ospedaliera con piano terapeutico.',
      controindicazioni: 'Sospendere su indicazione medica in caso di febbre >= 38 °C.',
    },
  ];

  return raw.map((item) => ({
    ...item,
    ...(DRUG_LEAFLETS[item.farmaco] ?? {}),
  }));
}

export function createSeedAppointments(): AppointmentItem[] {
  return [
    {
      id: 'APT001',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(2, 10, 30),
      durata_minuti: 45,
      tipo: 'Visita Oncologica di Follow-up',
      medico_responsabile: 'Dr.ssa Elena Bianchi',
      struttura: 'Istituto Oncologico San Marco — Ambulatorio 4 (Pad. B)',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione B, Piano 2',
      telefono_struttura: '+39 02 5550 1420',
      indicazioni_accesso: 'Ingresso principale, accettazione sportello Day Hospital 15 minuti prima.',
      trattamento_previsto: 'Valutazione tollerabilità Capecitabina Ciclo 3 e controllo esami ematici',
      preparazione: 'Portare referto emocromo e funzionalità epatica eseguiti negli ultimi 5 giorni. Non è richiesto il digiuno.',
      cosa_portare: [
        'Tessera sanitaria e documento d’identità',
        'Referto emocromo e funzionalità epatica recenti',
        'Elenco aggiornato dei farmaci assunti a domicilio',
      ],
    },
    {
      id: 'APT002',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(6, 8, 30),
      durata_minuti: 30,
      tipo: 'Prelievo Ematico di Controllo',
      medico_responsabile: 'Dr.ssa Elena Bianchi',
      struttura: 'Istituto Oncologico San Marco — Punto Prelievi Piano 1',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Corpo Centrale, Piano 1',
      telefono_struttura: '+39 02 5550 1400',
      indicazioni_accesso: 'Ritirare il numero prioritario per pazienti in terapia oncologica al totem giallo.',
      trattamento_previsto: 'Emocromo completo, creatinina, transaminasi e bilirubina',
      preparazione: 'Presentarsi a digiuno da almeno 8 ore (consentita acqua naturale).',
      cosa_portare: [
        'Tessera sanitaria e impegnativa / esenzione 048',
        'Bottiglietta d’acqua per eventuale colazione post-prelievo',
      ],
    },
    {
      id: 'APT003',
      codice_paziente: 'PZ001',
      data_ora: romeOffsetIso(14, 15, 0),
      durata_minuti: 40,
      tipo: 'Consulenza Farmacogenetica (PharmGKB)',
      medico_responsabile: 'Dr. Marco Conti',
      struttura: 'Istituto Oncologico San Marco — Genetica Clinica',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione C, Stanza 12',
      telefono_struttura: '+39 02 5550 1488',
      indicazioni_accesso: 'Segreteria Genetica Clinica al piano rialzato.',
      trattamento_previsto: 'Revisione pannello CYP2D6 / DPYD per piano terapeutico a lungo termine',
      preparazione: 'Nessun digiuno richiesto.',
      cosa_portare: [
        'Tessera sanitaria',
        'Documentazione genetica familiare o referti di sequenziamento precedenti',
      ],
    },
    {
      id: 'APT004',
      codice_paziente: 'PZ002',
      data_ora: romeOffsetIso(3, 9, 15),
      durata_minuti: 60,
      tipo: 'Infusione Irinotecano · Ciclo 4',
      medico_responsabile: 'Dr.ssa Elena Bianchi',
      struttura: 'Istituto Oncologico San Marco — Day Hospital Oncologico',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione B, Piano Terra',
      telefono_struttura: '+39 02 5550 1410',
      indicazioni_accesso: 'Accesso diretto all’accettazione infermieristica del Day Hospital.',
      trattamento_previsto: 'Chemioterapia endovenosa in regime di Day Hospital con premedicazione',
      preparazione: 'Colazione leggera consentita. Segnalare subito eventuali episodi di diarrea nelle ultime 48 ore.',
      cosa_portare: [
        'Referto dell’ultimo emocromo',
        'Tessera sanitaria e piano terapeutico',
        'Abbigliamento comodo per la permanenza in poltrona',
      ],
    },
    {
      id: 'APT005',
      codice_paziente: 'PZ003',
      data_ora: romeOffsetIso(4, 11, 0),
      durata_minuti: 40,
      tipo: 'Controllo Emocromo e Terapia Olaparib',
      medico_responsabile: 'Dr.ssa Elena Bianchi',
      struttura: 'Istituto Oncologico San Marco — Ginecologia Oncologica',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione D, Piano 1',
      telefono_struttura: '+39 02 5550 1445',
      indicazioni_accesso: 'Accettazione Ambulatorio Ginecologia Oncologica.',
      trattamento_previsto: 'Valutazione emoglobina e tollerabilità mantenimento PARP-inibitore',
      preparazione: 'Nessuna preparazione speciale; assumere regolarmente la dose mattutina di Olaparib.',
      cosa_portare: ['Esami del sangue recenti', 'Tessera sanitaria', 'Confezione residua di Olaparib per rinnovo piano'],
    },
    {
      id: 'APT006',
      codice_paziente: 'PZ004',
      data_ora: romeOffsetIso(5, 14, 30),
      durata_minuti: 45,
      tipo: 'Visita Toracica + ECG di Controllo',
      medico_responsabile: 'Dr.ssa Elena Bianchi',
      struttura: 'Istituto Oncologico San Marco — Oncologia Toracica',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione B, Piano 3',
      telefono_struttura: '+39 02 5550 1460',
      indicazioni_accesso: 'Presentarsi allo sportello Toracica 20 minuti prima per l’ECG.',
      trattamento_previsto: 'Monitoraggio QTc e rivalutazione TC torace',
      preparazione: 'Non applicare creme grasse sul torace la mattina dell’ECG.',
      cosa_portare: ['CD e referto della TC torace eseguita', 'Tessera sanitaria', 'ECG precedenti'],
    },
    {
      id: 'APT007',
      codice_paziente: 'PZ005',
      data_ora: romeOffsetIso(7, 10, 0),
      durata_minuti: 35,
      tipo: 'Visita Dermatologica e Controllo BRAF',
      medico_responsabile: 'Dr. Marco Conti',
      struttura: 'Istituto Oncologico San Marco — Melanoma Unit',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano · Padiglione A, Piano 2',
      telefono_struttura: '+39 02 5550 1472',
      indicazioni_accesso: 'Sportello Melanoma Unit al secondo piano.',
      trattamento_previsto: 'Controllo cutaneo e profilo tollerabilità Dabrafenib/Trametinib',
      preparazione: 'Evitare smalto scuro su unghie e trucco sul viso per facilitare l’esame dermatoscopico.',
      cosa_portare: ['Diario episodi febbrili', 'Tessera sanitaria', 'Referti dermatologici precedenti'],
    },
  ];
}

export function createSeedBookingReminders(): BookingReminderItem[] {
  return [
    {
      id: 'REM001',
      codice_paziente: 'PZ001',
      titolo: 'Ecocardiogramma di controllo semestrale',
      specialita: 'Cardiologia Oncologica',
      scadenza_consigliata: romeOffsetIso(10, 9, 0),
      struttura_suggerita: 'Istituto Oncologico San Marco — Ambulatorio Cardiologia (Pad. A)',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '800 638 638',
      medico_suggerito: 'Dr.ssa Elena Bianchi (richiedente)',
      documenti_richiesti: [
        'Impegnativa dematerializzata per Ecocardiogramma Color-Doppler',
        'Codice esenzione 048',
        'Tessera sanitaria',
      ],
      istruzioni_prenotazione:
        'Chiama il CUP regionale o lo sportello interno di Cardiologia Oncologica specificando percorso oncologico attivo con esenzione 048.',
      preparazione_richiesta: 'Nessun digiuno necessario; portare ultimo ECG disponibile.',
      cosa_portare: ['Tessera sanitaria', 'Impegnativa medica', 'Ultimo referto cardiologico'],
      urgenza: 'prioritaria',
      stato: 'da_prenotare',
    },
    {
      id: 'REM002',
      codice_paziente: 'PZ001',
      titolo: 'Visita Senologica post-Ciclo 4',
      specialita: 'Senologia Oncologica',
      scadenza_consigliata: romeOffsetIso(18, 11, 0),
      struttura_suggerita: 'Istituto Oncologico San Marco — Breast Unit (Pad. B)',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '+39 02 5550 1420',
      medico_suggerito: 'Dr.ssa Elena Bianchi',
      documenti_richiesti: [
        'Impegnativa per Visita Senologica di controllo',
        'Tessera sanitaria',
      ],
      istruzioni_prenotazione:
        'Prenotabile direttamente alla segreteria della Breast Unit al termine della prossima visita.',
      preparazione_richiesta: 'Portare eventuali ecografie o mammografie degli ultimi 6 mesi.',
      cosa_portare: ['Referti imaging mammario', 'Tessera sanitaria'],
      urgenza: 'ordinaria',
      stato: 'da_prenotare',
    },
    {
      id: 'REM003',
      codice_paziente: 'PZ002',
      titolo: 'Dosaggio marcatori CEA e controllo emocromo pre-Ciclo 5',
      specialita: 'Laboratorio Analisi / Day Hospital',
      scadenza_consigliata: romeOffsetIso(12, 8, 0),
      struttura_suggerita: 'Istituto Oncologico San Marco — Punto Prelievi',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '800 638 638',
      medico_suggerito: 'Dr.ssa Elena Bianchi',
      documenti_richiesti: ['Impegnativa emocromo + CEA + funzionalità epatica', 'Esenzione 048'],
      istruzioni_prenotazione:
        'Fissare il prelievo 48 ore prima della successiva infusione di Irinotecano.',
      preparazione_richiesta: 'Digiuno da 8 ore prima del prelievo.',
      cosa_portare: ['Tessera sanitaria', 'Impegnativa'],
      urgenza: 'prioritaria',
      stato: 'da_prenotare',
    },
    {
      id: 'REM004',
      codice_paziente: 'PZ003',
      titolo: 'Ecografia pelvica di controllo trimestrale',
      specialita: 'Ginecologia Oncologica',
      scadenza_consigliata: romeOffsetIso(15, 10, 30),
      struttura_suggerita: 'Istituto Oncologico San Marco — Ginecologia Oncologica',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '+39 02 5550 1445',
      medico_suggerito: 'Dr.ssa Elena Bianchi',
      documenti_richiesti: ['Impegnativa ecografia pelvica', 'Esenzione 048', 'Tessera sanitaria'],
      istruzioni_prenotazione:
        'Contattare la segreteria di Ginecologia Oncologica dal lunedì al venerdì (09:00–13:00).',
      preparazione_richiesta: 'Bere 500 ml di acqua 1 ora prima dell’esame se indicato dall’ambulatorio.',
      cosa_portare: ['Referto ultima ecografia e CA-125', 'Tessera sanitaria'],
      urgenza: 'ordinaria',
      stato: 'da_prenotare',
    },
    {
      id: 'REM005',
      codice_paziente: 'PZ004',
      titolo: 'TC torace con mezzo di contrasto (rivalutazione)',
      specialita: 'Radiologia Oncologica',
      scadenza_consigliata: romeOffsetIso(20, 9, 30),
      struttura_suggerita: 'Istituto Oncologico San Marco — Radiologia Pad. C',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '800 638 638',
      medico_suggerito: 'Dr.ssa Elena Bianchi',
      documenti_richiesti: ['Impegnativa TC torace con MdC', 'Creatininemia recente (< 30 giorni)', 'Esenzione 048'],
      istruzioni_prenotazione:
        'Prenotare tramite CUP indicando terapia target con Osimertinib in corso.',
      preparazione_richiesta: 'Digiuno da cibi solidi nelle 6 ore precedenti; eseguire creatinina prima dell’esame.',
      cosa_portare: ['Referto creatininemia', 'CD TC precedente', 'Tessera sanitaria'],
      urgenza: 'prioritaria',
      stato: 'da_prenotare',
    },
    {
      id: 'REM006',
      codice_paziente: 'PZ005',
      titolo: 'Visita Oculistica di controllo periodico',
      specialita: 'Oculistica',
      scadenza_consigliata: romeOffsetIso(14, 15, 0),
      struttura_suggerita: 'Istituto Oncologico San Marco — Ambulatorio Oculistica',
      indirizzo_struttura: 'Via San Marco 18, 20121 Milano',
      telefono_cup: '800 638 638',
      medico_suggerito: 'Dr. Marco Conti',
      documenti_richiesti: ['Impegnativa visita oculistica + fondo oculare', 'Esenzione 048'],
      istruzioni_prenotazione:
        'Prenotare controllo di sicurezza visiva previsto durante trattamento con Trametinib.',
      preparazione_richiesta: 'Portare occhiali da sole (possibile dilatazione pupillare con collirio).',
      cosa_portare: ['Tessera sanitaria', 'Elenco terapia BRAF/MEK'],
      urgenza: 'ordinaria',
      stato: 'da_prenotare',
    },
  ];
}

export function createSeedAlerts(): DoctorAlert[] {
  return [
    {
      id: 'ALT004',
      codice_paziente: 'PZ001',
      paziente_nome: 'Maria Rossi',
      doctor_id: 'DOC01',
      creata_il: romeOffsetIso(0, 8, 45),
      livello_urgenza: 'alta',
      titolo: 'Arrossamento intenso a mani e piedi segnalato prima del pasto',
      motivo:
        'La paziente segnala comparsa di formicolio e rossore ai palmi delle mani (intensità 7/10) compatibile con sindrome mano-piede di grado moderato-elevato in corso di Capecitabina.',
      azione_consigliata:
        'Contattare la paziente in giornata per valutare eventuale pausa o aggiustamento posologico prima della dose serale.',
      stato: 'nuova',
      canale_origine: 'chat_ai',
    },
    {
      id: 'ALT002',
      codice_paziente: 'PZ002',
      paziente_nome: 'Giuseppe Verdi',
      doctor_id: 'DOC01',
      creata_il: romeOffsetIso(-1, 17, 0),
      livello_urgenza: 'media',
      titolo: 'Stanchezza moderata (5/10) post-terapia',
      motivo:
        'Il paziente segnala stanchezza intensità 5/10 in associazione a profilo UGT1A1 *1/*28. Si consiglia monitoraggio idratazione ed emocromo prima del Ciclo 4.',
      azione_consigliata:
        'Verificare il referto emocromo prima della prossima infusione e confermare l’idratazione.',
      stato: 'nuova',
      canale_origine: 'chat_ai',
    },
    {
      id: 'ALT001',
      codice_paziente: 'PZ001',
      paziente_nome: 'Maria Rossi',
      doctor_id: 'DOC01',
      creata_il: romeOffsetIso(-1, 20, 15),
      livello_urgenza: 'bassa',
      titolo: 'Ansia pre-controllo segnalata nel diario',
      motivo:
        'La paziente ha registrato ansia lieve (intensità 4/10) in vista dei prossimi esami ematici. Nessun sintomo fisico d’allarme associato.',
      azione_consigliata:
        'Rassicurare la paziente al prossimo contatto o confermare il programma della visita.',
      stato: 'nuova',
      canale_origine: 'diario_automatico',
    },
    {
      id: 'ALT003',
      codice_paziente: 'PZ003',
      paziente_nome: 'Elena Ferrari',
      doctor_id: 'DOC01',
      creata_il: romeOffsetIso(-1, 18, 10),
      livello_urgenza: 'bassa',
      titolo: 'Astenia lieve durante mantenimento Olaparib',
      motivo:
        'La paziente riferisce astenia 4/10 e disgeusia 3/10. Valori compatibili con tossicità attesa lieve.',
      azione_consigliata:
        'Confermare emocromo al controllo programmato tra 4 giorni.',
      stato: 'nuova',
      canale_origine: 'diario_automatico',
    },
  ];
}

export function createSeedMessages(): DirectMessage[] {
  return [
    {
      id: 'MSG001',
      codice_paziente: 'PZ001',
      mittente: 'medico',
      nome_mittente: 'Dr.ssa Elena Bianchi',
      testo:
        'Buongiorno Maria, ho visto i suoi ultimi valori registrati. Continui pure con Capecitabina dopo i pasti principali e ci vediamo tra due giorni in ambulatorio.',
      canale: 'OncoCare',
      data_ora: romeOffsetIso(-1, 11, 20),
    },
  ];
}
