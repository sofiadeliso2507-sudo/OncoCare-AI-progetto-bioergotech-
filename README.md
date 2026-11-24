Il cuore della nostra indagine affronta l’isolamento terapeutico del paziente oncologico tra una seduta di trattamento e la successiva. Fuori dall’ospedale il malato resta spesso privo di un supporto immediato, con una fragilità fisica, emotiva e organizzativa che si declina in quattro punti critici:
Sconnessione ospedale-territorio: comunicazione frammentata e gestione quotidiana solitaria.
Accessi impropri al Pronto Soccorso: poche indicazioni a casa per sintomi lievi, con rischi infettivi per soggetti immunodepressi e sovraccarico dei reparti d’urgenza.
Frammentazione burocratica: prenotazioni CUP, referti ed esami in sedi diverse che disperdono energie.
Monitoraggio discontinuo: controlli periodici che fanno perdere la visione dell’andamento quotidiano.
 
Quest’app dev’essere configurata con il medico poiché appena si entra bisogna specificare il proprio ruolo (se professionista sanitario o paziente ) e insieme bisogna immettere diagnosi e referti e visite genetiche.  . Specifichiamo che per entrare nel proprio account c’è un autenticazione a doppio fattore. 
Il paziente in quest’app potrà fare domande all'Agent IA , Potrà  descrivere i propri sintomi (fisici e mentali) come un patient journey , l’agent ia può avvertire il medico in caso di incongruenze relative alle condizioni di salute. 
Questa applicazione ritroviamo anche notifiche push che possono avvertire il paziente per avvisare il paziente di visite imminenti e di farmaci da prendere.
Inoltre, nel momento in cui si clicca la notifica, si accede in uno spazio dell'applicazione in cui vi sono maggiori informazioni.
Nel primo caso, vengono fornite informazioni riguardanti il giorno, l'ora, il medico, la sede, il trattamento; prendendo le informazioni dai siti delle strutture ospedaliere e da siti ufficiali di medicina.
Nel secondo caso, il tipo di medicinale, quando deve essere preso, informazioni sulla reperibilità del farmaco, le controindicazioni,  prendendo i dati dai siti ufficiali AIFA e EMA.
Manda notifiche di promemoria per i farmaci e le visite , che tiene registrate in un calendario; i farmaci ancora da prendere sono blocati cosi da evitare di mettere che sono stati presi , così come anche i farmaci gia assunti per evitare di allarmare l'agent per un errore.
In caso di emergenza, il paziente può fare riferimento ad un'area dedicata, dove ci sono tasti per chiamare 112 o il medico in caso di bisogno. 
Quando in origine il paziente scarica l'applicazione, può scegliere il modo per avvertire la piattaforma del proprio malessere e far chiamare dall'Agente IA i soccorsi che saranno già a conoscenza della situazione base del paziente(informazioni prese direttamente dalla cartella elettronica condivisa tra paziente e medico/ struttura, 
che il malato ha acconsentito a condividere) e avvertire il medico curante tramite notifica. 
In aggiunta vi sono anche le informazioni riguardanti la posizione del paziente ( previa autorizzazione).
Risponde alle domande del paziente seguendo con rigore le limitzioni da noi imposte , nel caso appunto il paziente provi a chiedere qualcosa a cui l'agent non puoi rispedere lui notifhcerà la domanda all'account del dottore incarico.
aiuta a prenotare visite dado tutte le informazioni necessarie. Il dottore puo visualizzare i dati del paziente previa autorizzazione di esso.

Oltre ai siti d'informazione gia citati l'agent è predisposto per prendere anche informazioni sulla farmacogenomica da questi siti: https://www.pharmgkb.org/, https://pmc.ncbi.nlm.nih.gov/articles/PMC10233068/, https://pmc.ncbi.nlm.nih.gov/articles/PMC13018106/ . 
Questo poiché una nostra idea che non siamo riusciti ad inserire per mancanza di tempo era proprio quella di far dire dall'agent dopo che aveva preso visione dei risultati delle visite genetiche del paziente quale sarebbe potuta essere la terapia più adatte ed efficaci e anche i rischi di tossicità.
Per lo sviluppo del prototipo abbiamo scelto Google AI Studio, dopo aver valutato e testato diverse soluzioni tecniche. In una prima fase avevamo iniziato a impostare l'architettura combinando n8n, per la gestione dell'agente conversazionale, e GlideOS per l'interfaccia. 
Tuttavia, i vincoli del piano gratuito di queste piattaforme ci hanno impedito di proseguire, nonostante i test preliminari sull'agente n8n non avessero evidenziato criticità nella gestione dei limiti della chat o del trattamento dei dati personali. 
Di conseguenza, siamo passate a Google AI Studio, che ci ha permesso di strutturare il progetto in modo più fluido; resta comunque da segnalare che, anche in questo ambiente, l'utilizzo diretto della chat presenta delle limitazioni legate al piano gratuito.
I test finali fatti con l'agent di n8n non ha riscontato problemi (per quanto riguarda la chat) . tuti i dati dei pazienti nel prototipo sono di fantasia e non veri. 
