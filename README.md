# Sito Club Azzurro — Risultati Nazionale Atletica Leggera Paralimpica

Sito statico che legge i dati **in tempo reale** dal Google Sheet del database
atleti: non serve mai ricaricare nulla su GitHub quando aggiungi un risultato,
il sito si aggiorna da solo ad ogni visita.

## 1. Condividi il foglio Google

Il sito legge i dati con una richiesta pubblica al foglio, quindi va condiviso
almeno in visualizzazione:

1. Apri il Google Sheet del database.
2. In alto a destra, clicca **Condividi**.
3. Sotto "Accesso generale", scegli **Chiunque abbia il link**, ruolo
   **Visualizzatore**.
4. Salva.

**Attenzione:** questo rende visibile a chiunque abbia il link i dati contenuti
nel foglio, inclusi gli anni di nascita degli atleti nella scheda Atleti. Se
preferisci non pubblicare quella scheda, dimmelo e tolgo dal sito il
riferimento all'anno di nascita: le pagine funzionano comunque, mostrando solo
classe e sesso.

## 2. Metti i file su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `club-azzurro-risultati`), pubblico.
2. Carica dentro tutti i file di questa cartella, mantenendo la struttura
   (`index.html`, `risultati.html`, `atleta.html`, `gara.html`, le cartelle
   `css/` e `js/`).
3. Vai su **Settings → Pages** del repository.
4. In "Source", scegli il branch principale (es. `main`) e cartella `/root`.
5. Salva: dopo un minuto o due, GitHub ti mostra l'indirizzo del sito (di
   solito `https://tuonome.github.io/club-azzurro-risultati/`).

## 3. Controlla che tutto funzioni

Apri il sito e controlla:
- La pagina Riepilogo mostra la tabella con tutti gli atleti.
- Cliccando su un atleta, si apre la sua scheda con storico e PB/SB.
- Cliccando su una gara, si apre l'elenco dei tuoi atleti in quella gara.

Se compare il messaggio "Non riesco a leggere il foglio Google", quasi
sempre significa che il passaggio 1 (condivisione) non è stato fatto o è
scaduto: ricontrollalo.

## Cambiare foglio in futuro

Se in futuro il database cambia indirizzo (es. lo ricrei da zero su un nuovo
file), aggiorna una sola riga in `js/data.js`:

```js
const SHEET_ID = "INCOLLA_QUI_IL_NUOVO_ID";
```

L'ID è la parte dell'indirizzo del foglio tra `/d/` e `/edit`.

## Limiti di questa prima versione

- Le pagine leggono al massimo 1000 risultati alla volta nella tabella
  "Risultati" (i filtri aiutano a restringere la ricerca); Riepilogo e le
  schede atleta/gara non hanno questo limite.
- Non c'è ricerca full-text sofisticata: cerca per nome o parte del nome.
- Se qualcosa non torna o vuoi aggiungere una vista, dimmelo — è tutto facile
  da modificare.
