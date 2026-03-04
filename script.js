/* ==========================================================================
   1. GLOBALE VARIABLEN
   ========================================================================== */

const APP_DEFAULTS = {
    fahrer: "CHEF",
    produkte: [{ name: "Produkt 1", preis: 0.50, sichtbar: true },
        { name: "Produkt 2", preis: 0.90, sichtbar: true },
        { 
            name: "Gruppe 1", 
            sichtbar: true, 
            unterauswahl: [
                { name: "Produkt 3", preis: 3.80, sichtbar: true },
                { name: "Produkt 4", preis: 4.20, sichtbar: true }
            ]
      }]    
};

let sollzeiten = JSON.parse(localStorage.getItem('gei_sollzeiten')) || {
    "Mo": { start: "06:00", ende: "08:00", aktiv: true },
    "Di": { start: "06:00", ende: "08:00", aktiv: true },
    "Mi": { start: "06:00", ende: "08:00", aktiv: true },
    "Do": { start: "06:00", ende: "08:00", aktiv: true },
    "Fr": { start: "06:00", ende: "08:00", aktiv: true },
    "Sa": { start: "00:00", ende: "00:00", aktiv: false },
    "So": { start: "00:00", ende: "00:00", aktiv: false }
};


let aktuellerBetrag = 0;
let artikelAnzahl = 0;
let transaktionsNummer = parseInt(localStorage.getItem('gei_nummer')) || 0;
let umsatzWare = parseFloat(localStorage.getItem('umsatzWare')) || 0;
let trinkgeldGesamt = parseFloat(localStorage.getItem('trinkgeldGesamt')) || 0;
let tagesStatistikProdukte = JSON.parse(localStorage.getItem('gei_strichliste')) || {};
let berichtErstellt = false;
let zwischenliste = []; // Hält die aktuellen Produkte fest
let fahrerName = localStorage.getItem('gei_fahrer') || APP_DEFAULTS.fahrer;
let produkte = JSON.parse(localStorage.getItem('gei_produkte')) || JSON.parse(JSON.stringify(APP_DEFAULTS.produkte));


// Werkseinstellungen für Zeiterfassung
let zeiterfassung = JSON.parse(localStorage.getItem('gei_zeiterfassung')) || [];
let laufendeStartzeit = localStorage.getItem('gei_laufende_startzeit') || null;
let berichtMonat = new Date().getMonth() + 1;
let berichtJahr = new Date().getFullYear();


/* ==========================================================================
   2. START-UP LOGIK
   ========================================================================== */
window.onload = function() {
    // 1. Daten-Wiederherstellung
    const saved = localStorage.getItem('gei_produkte');
    if (saved && saved !== "undefined" && saved !== "null") {
        try {
            produkte = JSON.parse(saved);
        } catch (e) {
            console.error("Fehler beim Parsen der Produkte:", e);
        }
    }

    const savedFahrer = localStorage.getItem('gei_fahrer');
    if (savedFahrer) fahrerName = savedFahrer;
  
  // Zeiterfassung initialisierung 
    refreshStempelUI();
    renderZeiterfassungListe();


    // 2. UI-Elemente initialisieren (Werte setzen)
    const headerAnzeige = document.getElementById('display-fahrer');
    if (headerAnzeige) headerAnzeige.innerText = fahrerName.toUpperCase();

    const tickerContainer = document.getElementById('ticker-liste');
    if (tickerContainer) {
        tickerContainer.innerHTML = localStorage.getItem('gei_ticker_html') || "";
    }

    // 3. Funktionen starten
    setupProduktButtons();
    updateUmsatzAnzeige();
    updateClock();
    setInterval(updateClock, 1000);
    
    // 4. Start-Ansicht festlegen
    navigation('main-view');

    // 5. Splash-Screen & App-Übergang (Der sanfte Start)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.querySelector('.app-container');

        // Splash ausfaden
        if (splash) splash.style.opacity = '0';

        setTimeout(() => {
            if (splash) splash.style.display = 'none';
            if (app) {
                // WICHTIG: Hier nutzen wir jetzt flex für dein Grid
                app.style.display = 'flex'; 
                // Kurze Verzögerung für die Opacity-Transition
                setTimeout(() => {
                    app.style.opacity = '1';
                }, 50);
            }
        }, 500); // Zeit für das Ausfaden des Splash
    }, 800); // Wartezeit Logo-Präsentation
};

/* ==========================================================================
   3. KERN-LOGIK (VERKAUF & UHR)
   ========================================================================== */
function updateClock() {
    const d = new Date();
    const dEl = document.getElementById('live-date');
    const tEl = document.getElementById('live-time');
    if (dEl) dEl.innerText = d.toLocaleDateString();
    if (tEl) tEl.innerText = d.toLocaleTimeString();
}


function addBetrag(preis, name) {
    // 1. Nur in die temporäre Liste legen
    zwischenliste.push({ name: name, preis: preis });
    
    // 2. Aktuelle Anzeige berechnen (Summe der Zwischenliste)
    aktuellerBetrag = zwischenliste.reduce((sum, item) => sum + item.preis, 0);
    artikelAnzahl = zwischenliste.length;
    
    // 3. NUR das Display aktualisieren, noch NICHT die Statistik!
    updateDisplay();
}

function transaktionAbschliessen() {
    if (zwischenliste.length === 0) return;

    // Jetzt erst wandern die Daten in die Statistik
    zwischenliste.forEach(item => {
        if (!tagesStatistikProdukte[item.name]) tagesStatistikProdukte[item.name] = 0;
        tagesStatistikProdukte[item.name]++;
        
        // Den permanenten Tagesumsatz erhöhen
        umsatzWare += item.preis; 
    });

    // Speichern
    localStorage.setItem('gei_strichliste', JSON.stringify(tagesStatistikProdukte));
    localStorage.setItem('umsatzWare', umsatzWare);
    
    // Warenkorb leeren für den nächsten Kunden
    zwischenliste = [];
    aktuellerBetrag = 0;
    artikelAnzahl = 0;
    
    updateDisplay();
    // Hier evtl. noch den Ticker-Eintrag schreiben
}



function updateDisplay() {
    const rBetrag = document.getElementById('rechnungs-betrag');
    const bPassend = document.getElementById('btn-passend');
    if (rBetrag) rBetrag.innerText = aktuellerBetrag.toFixed(2) + " €";
    if (bPassend) bPassend.innerText = "Σ: " + aktuellerBetrag.toFixed(2);
    
    let a50 = Math.ceil(aktuellerBetrag * 2) / 2; 
    if (a50 <= aktuellerBetrag) a50 += 0.5;
    let aEu = Math.ceil(aktuellerBetrag); 
    if (aEu <= aktuellerBetrag) aEu += 1.0;
    
    const b50 = document.getElementById('btn-auf50');
    const bEu = document.getElementById('btn-aufEuro');
    
    if (b50) {
        b50.innerText = `½→ ${a50.toFixed(2)}`;
        b50.onclick = () => verbuchen(a50 - aktuellerBetrag);
    }
    if (bEu) {
        bEu.innerText = `€→ ${aEu.toFixed(2)}`;
        bEu.onclick = () => verbuchen(aEu - aktuellerBetrag);
    }
}

function verbuchen(tip = 0) {
    // 1. Sicherheit: Wenn nichts ausgewählt wurde, nichts tun
    if (zwischenliste.length === 0) return;

    // 2. Jeden Artikel aus der Zwischenliste fest in die Statistik buchen
    zwischenliste.forEach(item => {
        // In den permanenten Tagesumsatz (Ware) rechnen
        umsatzWare += item.preis;
        
        // In die Strichliste (Statistik) eintragen
        if (!tagesStatistikProdukte[item.name]) tagesStatistikProdukte[item.name] = 0;
        tagesStatistikProdukte[item.name]++;
    });

    // 3. Trinkgeld und Transaktionsnummer erhöhen
    trinkgeldGesamt += tip;
    transaktionsNummer++;

    // 4. Alles dauerhaft im LocalStorage speichern
    localStorage.setItem('gei_strichliste', JSON.stringify(tagesStatistikProdukte));
    localStorage.setItem('umsatzWare', umsatzWare);
    localStorage.setItem('trinkgeldGesamt', trinkgeldGesamt);
    localStorage.setItem('gei_nummer', transaktionsNummer);

    // 5. Ticker-Eintrag erstellen (Nutzt den berechneten aktuellerBetrag vor dem Reset)
    const jetzt = new Date();
    const datum = jetzt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const zeit = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    const ticker = document.getElementById('ticker-liste');
    const eintrag = document.createElement('li');
    eintrag.innerHTML = `
        <span style="color:#f1c40f">🛒 #${transaktionsNummer}</span> 
        <span style="color:#888; font-size:0.8rem;">[${datum} ${zeit}]</span> 
        <span style="color:#ecf0f1">Art: ${zwischenliste.length}</span> | 
        <span style="color:#2ecc71; font-weight:bold;">Σ ${aktuellerBetrag.toFixed(2)}€</span> 
        <span style="color:#3498db; font-size:0.8rem;">(+${tip.toFixed(2)}€)</span>`;

    if (ticker) {
        ticker.insertBefore(eintrag, ticker.firstChild);
        localStorage.setItem('gei_ticker_html', ticker.innerHTML);
    }
    
    // 6. WICHTIG: Den Warenkorb leeren und UI auf Null setzen
    resetAktuellerKunde();
    updateUmsatzAnzeige();
}

function resetAktuellerKunde() {
    // 1. WICHTIG: Die Liste der gewählten Artikel wirklich leeren
    zwischenliste = []; 
    
    // 2. Zahlenwerte zurücksetzen
    aktuellerBetrag = 0; 
    artikelAnzahl = 0;
    
    // 3. UI-Elemente aktualisieren
    const rBetrag = document.getElementById('rechnungs-betrag');
    const bPassend = document.getElementById('btn-passend');
    const b50 = document.getElementById('btn-auf50');
    const bEu = document.getElementById('btn-aufEuro');

    if (rBetrag) rBetrag.innerText = "0.00 €";
    if (bPassend) bPassend.innerText = "Σ: 0.00";
    if (b50) b50.innerText = "½→";
    if (bEu) bEu.innerText = "€→";
}

function updateUmsatzAnzeige() {
    const gesamt = umsatzWare + trinkgeldGesamt;
    const ids = {'display-ware': umsatzWare, 'display-trinkgeld': trinkgeldGesamt, 'display-gesamt': gesamt};
    for (let [id, val] of Object.entries(ids)) {
        let el = document.getElementById(id);
        if (el) el.textContent = val.toFixed(2);
    }
    localStorage.setItem('umsatzWare', umsatzWare);
    localStorage.setItem('trinkgeldGesamt', trinkgeldGesamt);
}

/* ==========================================================================
   4. UI & NAVIGATION
   ========================================================================== */

function setupProduktButtons() {
    const container = document.getElementById('produkt-container');
    if (!container) return;
    container.innerHTML = "";
    
    // Nur sichtbare Produkte auf der Hauptebene verarbeiten
    produkte.filter(p => p.sichtbar !== false).forEach(p => {
        const b = document.createElement('button');
        
        if (p.unterauswahl && Array.isArray(p.unterauswahl)) {
            // FALL A: Gruppe (Öffnet Overlay)
            b.innerHTML = `<span>${p.name}</span><span class="btn-price-tag">Gruppe ▾</span>`;
            b.onclick = () => openOverlay(p.name, p.unterauswahl);
        } else {
            // FALL B: Einzelprodukt
            const preis = typeof p.preis === 'number' ? p.preis : 0;
            b.innerHTML = `<span>${p.name}</span><span class="btn-price-tag">${preis.toFixed(2)}€</span>`;
            b.onclick = () => addBetrag(preis, p.name);
        }
        container.appendChild(b);
    });
}

function openOverlay(titel, liste) {
    const contentEl = document.getElementById('overlay-content');
    const titelEl = document.getElementById('overlay-titel');
    if (titelEl) titelEl.innerText = titel;
    contentEl.innerHTML = "";

    liste.filter(item => item.sichtbar !== false).forEach(item => {
        let btn = document.createElement('button');
        const preis = typeof item.preis === 'number' ? item.preis : 0;
        btn.innerHTML = `<span>${item.name}</span><span class="btn-price-tag">${preis.toFixed(2)}€</span>`;
        btn.onclick = () => { 
            addBetrag(preis, item.name); 
            closeOverlay(); 
        };
        contentEl.appendChild(btn);
    });
    document.getElementById('overlay').style.display = "flex";
}

function closeOverlay() { document.getElementById('overlay').style.display = "none"; }

function navigation(zielId) {
    // 1. SPERRE: Unverändert
    if (zwischenliste.length > 0 && zielId !== 'main-view') {
        alert("⚠️ Bitte erst den aktuellen Verkauf abschließen oder mit 'C' löschen!");
        return; 
    }

    // 2. Alle Views verstecken
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
    });

    // 3. Ziel-View anzeigen
    const zielView = document.getElementById(zielId);
    if (zielView) {
        zielView.style.display = 'block';
    }

    // 4. Icons umschalten
    const icons = document.querySelectorAll('.icon-btn');
    icons.forEach(i => i.classList.remove('active'));

    // 5. Logik-Zuweisung
    if (zielId === 'main-view') {
        icons[0]?.classList.add('active');
        setupProduktButtons(); 
    } else if (zielId === 'stats-view') {
        icons[1]?.classList.add('active');
        const vorschau = document.getElementById('bericht-live-text');
        if (vorschau) vorschau.innerText = generiereBerichtText();
    } else if (zielId === 'time-view') {
        icons[2]?.classList.add('active');
        renderZeiterfassungListe();
        refreshStempelUI();
     
    } else if (zielId === 'settings-view') {
        icons[3]?.classList.add('active');
        fillSettingsForm(); // Hier wird nun auch der Fahrer-Input initialisiert
    } else if (zielId === 'info-view') {
        icons[4]?.classList.add('active'); 
    }
}

/* ==========================================================================
   5. SETTINGS & EDITOR (MODULAR)
   ========================================================================== */
function erzeugeProduktZeile(item, index, subIndex = null) {
    const row = document.createElement('div');
    row.className = "produkt-row";

    // 1. Drag-Handle
    const handle = document.createElement('div');
    handle.className = "drag-handle";
    handle.innerHTML = "☰";

    // 2. Sichtbarkeit Checkbox
    const cb = document.createElement('input');
    cb.type = "checkbox";
    cb.checked = item.sichtbar !== false;
    cb.onchange = () => produkteSpeichernSilently(cb);

    // 3. Name Input
    const nameInp = document.createElement('input');
    nameInp.type = "text";
    nameInp.className = "editor-input-name";
    nameInp.value = item.name;
    nameInp.onblur = () => produkteSpeichernSilently(nameInp);

    // 4. Preis Input
    const priceInp = document.createElement('input');
    priceInp.type = "number";
    priceInp.className = "editor-input-price";
    priceInp.inputMode = "decimal";
    priceInp.step = "0.01";
    priceInp.value = item.preis ? item.preis.toFixed(2) : "0.00";

    // Schutz vor Scrollen/Pfeiltasten bei Zahlenfeldern
    priceInp.onwheel = (e) => e.preventDefault();
    priceInp.onkeydown = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    };

    priceInp.onblur = function() {
        let wert = parseFloat(this.value) || 0;
        let abgeschnitten = Math.floor((wert + 0.00001) * 100) / 100;
        this.value = abgeschnitten.toFixed(2);
        produkteSpeichernSilently(this);
    };

    // 5. Lösch-Button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "🗑️";
    delBtn.className = "btn-delete-item";
    delBtn.onclick = () => produktLoeschen(index, subIndex);

    // Zusammenfügen
    row.append(handle, cb, nameInp, priceInp, delBtn);

    return row;
}

/**
 * Hilfsfunktion: Speichert alles im Hintergrund, 
 * ohne das nervige "Gespeichert!"-Alert-Fenster.
 */
function produkteSpeichernSilently(element) {
    // 1. Daten aus dem UI auslesen
    produkte = leseAktuelleSortierung();
    
    // 2. Im LocalStorage zementieren
    localStorage.setItem('gei_produkte', JSON.stringify(produkte));
    
    // 3. Die Kassen-Buttons im Hintergrund aktualisieren
    setupProduktButtons();
    
    // 4. Animation auslösen, wenn ein Element übergeben wurde
    if (element && typeof showSaveAnimation === "function") {
        showSaveAnimation(element);
    }
    
    console.log("Auto-Save für Produkt-Feld durchgeführt.");
}

function fillSettingsForm() {
    // NEU: Fahrer-Input Logik integrieren
    const inputFahrer = document.getElementById('input-fahrer');
    if (inputFahrer) {
        inputFahrer.value = fahrerName;
        inputFahrer.className = "editor-input-name"; // Gleicher Style wie Produkte
        
        inputFahrer.onblur = function() {
            const neuerName = this.value.trim() || "CHEF";
            fahrerName = neuerName;
            localStorage.setItem('gei_fahrer', fahrerName);
            
            // Header sofort aktualisieren
            const headerAnzeige = document.getElementById('display-fahrer');
            if (headerAnzeige) headerAnzeige.innerText = fahrerName.toUpperCase();
            
            // Konsistentes visuelles Feedback (grünes Flackern)
            if (typeof produkteSpeichernSilently === "function") {
                produkteSpeichernSilently(this);
            }
        };
    }

    const container = document.getElementById('preis-editor');
    if (!container) return;
    container.innerHTML = "";

    produkte.forEach((p, i) => {
        if (!p.unterauswahl) {
            // FALL 1: Einzelprodukt auf Hauptebene
            container.appendChild(erzeugeProduktZeile(p, i));
        } else {
            // FALL 2: Gruppe
            const catBox = document.createElement('div');
            catBox.className = "category-group";

            const catHeader = document.createElement('div');
            catHeader.style = "display: flex; align-items: center; gap: 10px; margin-bottom: 10px;";
            catHeader.innerHTML = `
                <div class="drag-handle" style="color:#f1c40f;">☰</div>
                <input type="text" class="cat-title-input editor-input-name" value="${p.name}" 
                       onblur="produkteSpeichernSilently(this)">
                <button class="btn-delete-item" onclick="produktLoeschen(${i})">🗑️</button>`;

            const subContainer = document.createElement('div');
            subContainer.className = "sub-sortable";

            // Unterprodukte der Gruppe rendern
            p.unterauswahl.forEach((u, j) => {
                subContainer.appendChild(erzeugeProduktZeile(u, i, j));
            });

            catBox.append(catHeader, subContainer);
            container.appendChild(catBox);

            // Sortable für diesen speziellen Untercontainer
            new Sortable(subContainer, {
                group: 'shared-items',
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: () => produkteSpeichernSilently()
            });
        }
    });

    // Haupt-Sortable für die gesamte Liste (Produkte & Gruppen)
    new Sortable(container, {
        group: 'shared-items',
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: () => produkteSpeichernSilently()
    });
}

function leseAktuelleSortierung() {
    const neuerStand = [];
    const editor = document.getElementById('preis-editor');
    if (!editor) return produkte;

    // Wir gehen durch jedes Kind-Element des Editors
    Array.from(editor.children).forEach(node => {
        
        // FALL A: Es ist eine Gruppe (Container)
        if (node.classList.contains('category-group')) {
            const catNameInput = node.querySelector('.cat-title-input');
            const subContainer = node.querySelector('.sub-sortable');
            const unterliste = [];

            if (subContainer) {
                Array.from(subContainer.children).forEach(subNode => {
                    if (subNode.classList.contains('produkt-row')) {
                        unterliste.push(extrahiereDatenDirektAusZeile(subNode));
                    }
                });
            }
            
            neuerStand.push({ 
                name: catNameInput ? catNameInput.value : "Gruppe", 
                sichtbar: true, 
                unterauswahl: unterliste 
            });

        // FALL B: Es ist ein Einzelprodukt auf der Hauptebene
        } else if (node.classList.contains('produkt-row')) {
            neuerStand.push(extrahiereDatenDirektAusZeile(node));
        }
    });
    return neuerStand;
}

/**
 * NEU & SICHER: Diese Funktion sucht die Inputs RELATIV zur Zeile.
 * So ist es völlig egal, welche ID oder welchen Index das Produkt vorher hatte.
 */
function extrahiereDatenDirektAusZeile(row) {
    const nameInp = row.querySelector('.editor-input-name');
    const priceInp = row.querySelector('.editor-input-price');
    const checkInp = row.querySelector('input[type="checkbox"]');

    return {
        name: nameInp ? nameInp.value : "Unbekannt",
        preis: priceInp ? parseFloat(priceInp.value) || 0 : 0,
        sichtbar: checkInp ? checkInp.checked : true
    };
}

function kopiereTagesbericht() {
    const berichtText = generiereBerichtText();
    
    if (!berichtText) {
        alert("Fehler: Bericht konnte nicht generiert werden.");
        return;
    }

    navigator.clipboard.writeText(berichtText).then(() => {
        // Erfolgsmeldung
        alert("✅ Tagesbericht in Zwischenablage kopiert!");
        
        // Status für den Tag-Reset setzen
        berichtErstellt = true;

        // Optional: Den Button optisch verändern
        const btn = document.querySelector('.btn-copy-report');
        if (btn) {
            btn.style.background = "linear-gradient(#27ae60, #2ecc71)";
            btn.innerText = "✅ Bericht kopiert";
        }
    }).catch(err => {
        console.error("Fehler beim Kopieren:", err);
        // Fallback für alte Browser/Handys
        prompt("Bericht kopieren:", berichtText);
    });
}

function neuerTagStarten() {
    let warnung = "Tag wirklich beenden? Alle Umsätze und die Strichliste werden gelöscht!";
    if (!berichtErstellt && umsatzWare > 0) {
        warnung = "⚠️ BERICHT NOCH NICHT KOPIERT!\n\n" + warnung;
    }

    if (confirm(warnung)) {
        umsatzWare = 0;
        trinkgeldGesamt = 0;
        transaktionsNummer = 0;
        tagesStatistikProdukte = {};
        
        // Nutze die zentrale Reset-Funktion
        resetAktuellerKunde(); 
        
        localStorage.removeItem('umsatzWare');
        localStorage.removeItem('trinkgeldGesamt');
        localStorage.removeItem('gei_nummer');
        localStorage.removeItem('gei_strichliste');
        localStorage.removeItem('gei_ticker_html');

        updateUmsatzAnzeige();
        const ticker = document.getElementById('ticker-liste');
        if (ticker) ticker.innerHTML = "";
        
        berichtErstellt = false;
        alert("Neuer Tag gestartet!");
        navigation('main-view');
    }
}


function neuesProduktHinzufuegen() {
    // Fügt das neue Produkt oben ein
    produkte.unshift({ name: "NEUES PRODUKT", preis: 0.00, sichtbar: true });
    
    // UI neu zeichnen
    fillSettingsForm(); 
    
    // Sofort im Hintergrund speichern
    produkteSpeichernSilently();
}

function neueGruppeHinzufuegen() {
    // Fügt die neue Gruppe oben ein
    produkte.unshift({ name: "NEUE GRUPPE", sichtbar: true, unterauswahl: [] });
    
    // UI neu zeichnen
    fillSettingsForm(); 
    
    // Sofort im Hintergrund speichern
    produkteSpeichernSilently();
}

function produktLoeschen(index, subIndex = null) {
    const istGruppe = subIndex === null && produkte[index].unterauswahl;
    const name = subIndex === null ? produkte[index].name : produkte[index].unterauswahl[subIndex].name;
    
    // Kurze Sicherheitsabfrage
    if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) return;

    if (subIndex === null) {
        // Löscht Hauptprodukt ODER die komplette Gruppe
        produkte.splice(index, 1);
    } else {
        // Löscht nur das Unterprodukt
        if (produkte[index] && produkte[index].unterauswahl) {
            produkte[index].unterauswahl.splice(subIndex, 1);
        }
    }

    // UI aktualisieren & Speichern
    fillSettingsForm(); 
    produkteSpeichernSilently();
}


/* ==========================================================================
   6. STATISTIK & BACKUP
   ========================================================================== */
function generiereBerichtText() {
    const datum = new Date().toLocaleDateString('de-DE');
    let b = `TAGESBERICHT: ${datum}\n`;
    b += `FAHRER: ${fahrerName.toUpperCase()}\n`;
    // Verlängerte Trennlinie für 20 Zeichen Namen + Spalten
    b += `--------------------------------------------------\n`;
    b += `${"ARTIKEL".padEnd(20)} | ANZ | PREIS   | SUMME\n`;
    b += `--------------------------------------------------\n`;
    
    for (const [name, anz] of Object.entries(tagesStatistikProdukte)) {
        let p = getP(name);
        let summe = p * anz;
        
        // Name auf 20 Zeichen begrenzen (substring) und mit Leerzeichen auffüllen
        let formatName = name.substring(0, 20).padEnd(20);
        
        b += `${formatName} | ${anz.toString().padStart(3)} | ${p.toFixed(2).padStart(6)}€ | ${summe.toFixed(2).padStart(7)}€\n`;
    }
    
    b += `--------------------------------------------------\n`;
    b += `WARE GESAMT:    ${umsatzWare.toFixed(2).padStart(23)} €\n`;
    b += `TRINKGELD:      ${trinkgeldGesamt.toFixed(2).padStart(23)} €\n`;
    b += `NETTO LOSUNG:   ${(umsatzWare + trinkgeldGesamt).toFixed(2).padStart(23)} €\n`;
    b += `KÄUFE: #${transaktionsNummer}`;
    
    return b;
}

function getP(n) {
    if (!produkte) return 0;

    for (const p of produkte) {
        // 1. Prüfung: Ist es ein direktes Produkt?
        if (p.name === n && p.preis !== undefined) {
            return p.preis;
        }

        // 2. Prüfung: Hat es eine Unterauswahl (Gruppe)?
        if (p.unterauswahl && Array.isArray(p.unterauswahl)) {
            for (const sub of p.unterauswahl) {
                // Hier prüfen wir sicherheitshalber, ob 'sub' existiert
                if (sub && sub.name === n) {
                    return sub.preis || 0;
                }
            }
        }
    }
    return 0;
}

function exportNachZwischenablage() {
    // Wir nehmen die LIVE-Daten aus der Variable, nicht den rohen Speicher
    if (!produkte || produkte.length === 0) {
        return alert("Fehler: Keine Produkte zum Exportieren vorhanden!");
    }

    try {
        const datenText = JSON.stringify(produkte);
        
        navigator.clipboard.writeText(datenText).then(() => {
            alert("✅ Preisliste (LIVE-STAND) kopiert!\n\nDu kannst sie jetzt in eine Nachricht einfügen.");
        }).catch(err => {
            // Fallback falls Clipboard-API blockiert wird (manche Browser)
            prompt("Kopiere diesen Code manuell:", datenText);
        });
    } catch (e) {
        alert("Fehler beim Erstellen des Exports: " + e.message);
    }
}

function importAusZwischenablage() {
    let importText = prompt("Bitte den exportierten Code hier einfügen:");
    if (!importText) return;

    try {
        // 1. Grundreinigung (Leerzeichen, Umbrüche weg)
        importText = importText.trim();
        
        // 2. Umwandeln in ein Objekt
        const checkData = JSON.parse(importText);

        // 3. Struktur-Check: Ist es ein Array?
        if (Array.isArray(checkData)) {
            // Wir speichern es sofort überall
            produkte = checkData;
            localStorage.setItem('gei_produkte', JSON.stringify(produkte));

            alert("✅ Import erfolgreich! " + produkte.length + " Einträge geladen.");
            
            // UI sofort aktualisieren (ohne Reload, um CodePen-Fehler zu vermeiden)
            setupProduktButtons();
            if (document.getElementById('settings-view').style.display === 'block') {
                fillSettingsForm();
            }
            navigation('main-view');
        } else {
            alert("❌ Fehler: Der Text enthält keine gültige Liste.");
        }
    } catch (e) {
        console.error("Import-Fehler:", e);
        alert("❌ UNGÜLTIGES FORMAT!\n\nDer Text ist kein sauberer Code. Hast du vielleicht beim Kopieren etwas vergessen?");
    }
}

function exportAlsDatei() {
    // 1. Daten vorbereiten
    const exportDaten = {
        zeitstempel: new Date().toISOString(),
        fahrer: fahrerName,
        produkte: produkte
    };

    try {
        // 2. In JSON-String umwandeln
        const dataStr = JSON.stringify(exportDaten, null, 2);
        
        // 3. Einen "Blob" (Daten-Objekt) erstellen
        const blob = new Blob([dataStr], { type: "application/json" });
        
        // 4. Download-Link unsichtbar im Hintergrund erstellen
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        
        // Dateiname generieren (z.B. backup_2026-02-11.json)
        const dateStr = new Date().toISOString().split('T')[0];
        downloadLink.href = url;
        downloadLink.download = `gei_backup_${dateStr}.json`;
        
        // 5. Download auslösen und aufräumen
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);

        alert("✅ Datei wurde erstellt und zum Download angeboten.");
    } catch (e) {
        console.error("Datei-Export Fehler:", e);
        alert("❌ Fehler beim Erstellen der Datei.");
    }
}

function importAusDatei() {
    // Erstellt ein unsichtbares Datei-Eingabefeld
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
            try {
                const geladeneDaten = JSON.parse(event.target.result);
                
                // Wir prüfen, ob die Datei von uns stammt (Stichwort: produkte)
                if (geladeneDaten && geladeneDaten.produkte) {
                    produkte = geladeneDaten.produkte;
                    if (geladeneDaten.fahrer) fahrerName = geladeneDaten.fahrer;
                    
                    // Speichern und UI aktualisieren
                    localStorage.setItem('gei_produkte', JSON.stringify(produkte));
                    localStorage.setItem('gei_fahrer', fahrerName);
                    
                    alert("✅ Backup erfolgreich geladen!");
                    location.reload(); // Einfachste Methode um alles zu übernehmen
                } else {
                    alert("❌ Ungültiges Dateiformat!");
                }
            } catch (err) {
                alert("❌ Fehler beim Lesen der Datei!");
            }
        };
        reader.readAsText(file);
    };

    fileInput.click();
}

function totalerReset(ev) {
    if (confirm("⚠️ WERKSEINSTELLUNG!\nAlles wird gelöscht. Fortfahren?")) {
        // 1. Speicher leeren
        localStorage.clear();

        // 2. Variablen aus dem zentralen APP_DEFAULTS Objekt wiederherstellen
        fahrerName = APP_DEFAULTS.fahrer;
        // Wichtig: Deep Copy der Produkte, damit die Vorlage nicht verändert wird
        produkte = JSON.parse(JSON.stringify(APP_DEFAULTS.produkte));
        
        // 3. Tagesdaten nullen
        umsatzWare = 0;
        trinkgeldGesamt = 0;
        transaktionsNummer = 0;
        tagesStatistikProdukte = {};

        // 4. UI-Elemente aktualisieren
        // Fahrernamen in der Anzeige und im Input-Feld anpassen
        const displayFahrer = document.getElementById('display-fahrer');
        if (displayFahrer) displayFahrer.innerText = fahrerName.toUpperCase();
        
        const inputFahrer = document.getElementById('input-fahrer');
        if (inputFahrer) inputFahrer.value = fahrerName;

        // Buttons und Umsatzanzeige neu zeichnen
        setupProduktButtons();
        updateUmsatzAnzeige();
        
        // Ticker leeren
        const ticker = document.getElementById('ticker-liste');
        if(ticker) ticker.innerHTML = "";
        
        alert("Werkseinstellungen geladen!");
        navigation('main-view');
    }
}

function showSaveAnimation(element) {
    element.classList.add('save-success');
    setTimeout(() => {
        element.classList.remove('save-success');
    }, 600); // Leuchtet für 0,6 Sekunden auf
}

// Diese Funktion einmalig beim Laden der App aufrufen!
function setupFahrerLogik() {
    const inputFahrer = document.getElementById('input-fahrer');
    if (inputFahrer) {
        inputFahrer.onblur = function() {
            fahrerName = this.value.trim() || "CHEF";
            localStorage.setItem('gei_fahrer', fahrerName);
            
            const headerAnzeige = document.getElementById('display-fahrer');
            if (headerAnzeige) headerAnzeige.innerText = fahrerName.toUpperCase();
            
            if (typeof showSaveAnimation === "function") {
                showSaveAnimation(this);
            }
        };
    }
}



/* ==========================================================================
   7. Zeiterfassung
   ========================================================================== */

function adjustTime(tag, feld, minuten) {
    let [stunden, mins] = sollzeiten[tag][feld].split(':').map(Number);
    let gesamtMinuten = stunden * 60 + mins + minuten;
    
    if (gesamtMinuten < 0) gesamtMinuten = 1440 + gesamtMinuten;
    if (gesamtMinuten >= 1440) gesamtMinuten -= 1440;
    
    let neueH = Math.floor(gesamtMinuten / 60).toString().padStart(2, '0');
    let neueM = (gesamtMinuten % 60).toString().padStart(2, '0');
    
    sollzeiten[tag][feld] = `${neueH}:${neueM}`;
    localStorage.setItem('gei_sollzeiten', JSON.stringify(sollzeiten));
    openSollzeitenEditor();
}

function openSollzeitenEditor() {
    const title = document.getElementById('overlay-titel');
    const content = document.getElementById('overlay-content');
    if (!title || !content) return;

    title.innerText = "Wochen-Sollplan";
    content.innerHTML = "";
    content.classList.add('overlay-single-col');

    const listContainer = document.createElement('div');
    listContainer.style.maxHeight = "60vh";
    listContainer.style.overflowY = "auto";

    Object.keys(sollzeiten).forEach(tag => {
        const data = sollzeiten[tag];
        const row = document.createElement('div');
        row.className = "sollplan-row";
        row.innerHTML = `
            <div class="sollplan-tag">${tag.substring(0, 2)}</div>
            <div class="time-control">
                <button class="btn-time-control" onclick="adjustTime('${tag}', 'start', -15)">-</button>
                <div class="time-display">${data.start}</div>
                <button class="btn-time-control" onclick="adjustTime('${tag}', 'start', 15)">+</button>
            </div>
            <div class="time-control">
                <button class="btn-time-control" onclick="adjustTime('${tag}', 'ende', -15)">-</button>
                <div class="time-display">${data.ende}</div>
                <button class="btn-time-control" onclick="adjustTime('${tag}', 'ende', 15)">+</button>
            </div>`;
        listContainer.appendChild(row);
    });

    content.appendChild(listContainer);

    // Der schmale, dezente Abbrechen-Button (halbe Höhe)
    const btnAbbrechen = document.createElement('button');
    btnAbbrechen.className = "btn-back";
    btnAbbrechen.innerHTML = "Abbrechen";
    btnAbbrechen.style.height = "35px"; 
    btnAbbrechen.style.marginTop = "15px";
    btnAbbrechen.onclick = closeOverlay;
    content.appendChild(btnAbbrechen);

    document.getElementById('overlay').style.display = 'flex';
}

function stempelStart() {
    if (laufendeStartzeit) return; 
    const jetzt = new Date();
    laufendeStartzeit = jetzt.getHours().toString().padStart(2, '0') + ":" + 
                        jetzt.getMinutes().toString().padStart(2, '0');
    localStorage.setItem('gei_laufende_startzeit', laufendeStartzeit);
    refreshStempelUI();
}

function stempelStop() {
    if (!laufendeStartzeit) return;

    const jetzt = new Date();
    const aktuelleEndzeit = jetzt.getHours().toString().padStart(2, '0') + ":" + 
                            jetzt.getMinutes().toString().padStart(2, '0');
    const heute = jetzt.toLocaleDateString('de-DE');

    // Hier greift deine 1/4 Stunden Logik:
    const finalStart = roundToQuarter(laufendeStartzeit, 'down');
    const finalEnd = roundToQuarter(aktuelleEndzeit, 'up');

    zeiterfassung.unshift({
        id: Date.now(),
        datum: heute,
        start: finalStart,
        ende: finalEnd,
        notiz: ""
    });

    localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung));
    laufendeStartzeit = null;
    localStorage.removeItem('gei_laufende_startzeit');
    
    refreshStempelUI();
    renderZeiterfassungListe();
}

function refreshStempelUI() {
    const btnStart = document.getElementById('btn-stempel-start');
    const btnStop = document.getElementById('btn-stempel-stop');
    const displayStart = document.getElementById('display-startzeit');
    if (!btnStart || !btnStop) return;

    if (laufendeStartzeit) {
        btnStart.style.background = "linear-gradient(#2c3e50, #1a252f)";
        btnStart.style.boxShadow = "inset 0 5px 15px rgba(0,0,0,0.8)";
        btnStart.style.transform = "translateY(4px)";
        btnStart.style.border = "1px solid #f1c40f";
        displayStart.innerText = "GESTARTET: " + laufendeStartzeit;
        btnStop.style.opacity = "1";
        btnStop.disabled = false;
    } else {
        btnStart.style.background = "";
        btnStart.style.boxShadow = "";
        btnStart.style.transform = "";
        btnStart.style.border = "";
        displayStart.innerText = "--:--";
        btnStop.style.opacity = "0.3";
        btnStop.disabled = true;
    }
}

function adjustEntryTime(index, feld, minuten) {
    let eintrag = zeiterfassung[index];
    if (!eintrag) return;

    const toMins = (t) => {
        let [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    let startMins = toMins(eintrag.start);
    let endeMins = toMins(eintrag.ende);
    let aktuellerWertMins = (feld === 'start') ? startMins : endeMins;
    
    let neuerWertMins = aktuellerWertMins + minuten;

    // --- NEUE GRENZLOGIK ---
    let illegal = false;

    // 1. Harte Grenzen (Start min 00:00 / Ende max 24:00)
    if (feld === 'start' && (neuerWertMins < 0 || neuerWertMins >= 1440)) {
        illegal = true; 
    }
    if (feld === 'ende' && (neuerWertMins <= 0 || neuerWertMins > 1440)) {
        illegal = true; 
    }

    // 2. Kollisionsprüfung (Start muss immer vor Ende liegen)
    if (feld === 'start' && neuerWertMins >= endeMins) {
        illegal = true;
    }
    if (feld === 'ende' && neuerWertMins <= startMins) {
        illegal = true;
    }

    const rows = document.querySelectorAll('.time-entry-row');
    const currentRow = rows[index];
    const displays = currentRow.querySelectorAll('.time-display');
    const targetIndex = (feld === 'start') ? 1 : 2;
    const targetElement = displays[targetIndex];

    if (illegal) {
        targetElement.classList.add('flash-error');
        setTimeout(() => targetElement.classList.remove('flash-error'), 400);
        return;
    }

    // Zeit-String bauen (Spezialfall 24:00)
    let neuStr;
    if (neuerWertMins === 1440) {
        neuStr = "24:00";
    } else {
        let h = Math.floor(neuerWertMins / 60).toString().padStart(2, '0');
        let m = (neuerWertMins % 60).toString().padStart(2, '0');
        neuStr = `${h}:${m}`;
    }

    zeiterfassung[index][feld] = neuStr;
    targetElement.innerText = neuStr;
    
    targetElement.classList.add('save-success');
    setTimeout(() => targetElement.classList.remove('save-success'), 400);

    localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung));
}

// 2. Datum anpassen (analog zur Zeit)
function adjustEntryDate(index, tage) {
    let parts = zeiterfassung[index].datum.split('.');
    // Erstellt ein Datumsobjekt: Jahr, Monat (0-11), Tag
    let d = new Date(parts[2], parts[1] - 1, parts[0]);
    d.setDate(d.getDate() + tage);
    
    // Neues Datum im deutschen Format generieren
    const neu = d.toLocaleDateString('de-DE');
    zeiterfassung[index].datum = neu;
    
    // UI Update ohne kompletten Reload der Liste (für die Performance)
    const row = document.querySelectorAll('.time-entry-row')[index];
    if (row) {
        const dParts = neu.split('.');
        const tagMonatAnzeige = dParts[0] + "." + dParts[1] + ".";
        row.querySelector('.time-display').innerText = tagMonatAnzeige;
    }
    
    localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung));
}

// 3. Notiz-Feld mit "Flackern" beim Verlassen
function saveEntryNotiz(index, inputElement) {
    zeiterfassung[index].notiz = inputElement.value;
    localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung));
    
    // 1. Klasse hinzufügen für das "Glow"-Feedback
    inputElement.classList.add('save-success');
    
    // 2. Nach 600ms dezent wieder entfernen
    setTimeout(() => {
        inputElement.classList.remove('save-success');
    }, 600);
}

function saveAndRefreshTime() {
    localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung));
    renderZeiterfassungListe();
}

function renderZeiterfassungListe() {
    const container = document.getElementById('zeiterfassung-liste');
    if (!container) return;
    container.innerHTML = "";

    zeiterfassung.forEach((e, i) => {
        // Sicherstellen, dass nur Tag und Monat angezeigt werden
        const dParts = e.datum.split('.');
        const tagMonatAnzeige = dParts[0] + "." + dParts[1] + ".";

        const row = document.createElement('div');
        row.className = "time-entry-row";
        row.innerHTML = `
            <div class="time-control">
                <button class="btn-time-control" onclick="adjustEntryDate(${i}, -1)">-</button>
                <div class="time-display" style="min-width: 50px;">${tagMonatAnzeige}</div>
                <button class="btn-time-control" onclick="adjustEntryDate(${i}, 1)">+</button>
            </div>
            
            <input type="text" class="editor-input-name" style="height: 32px !important;" 
                   value="${e.notiz || ''}" placeholder="Notiz..." 
                   onblur="saveEntryNotiz(${i}, this)">
            
            <div class="time-control">
                <button class="btn-time-control" onclick="adjustEntryTime(${i}, 'start', -15)">-</button>
                <div class="time-display">${e.start}</div>
                <button class="btn-time-control" onclick="adjustEntryTime(${i}, 'start', 15)">+</button>
            </div>

            <div class="time-control">
                <button class="btn-time-control" onclick="adjustEntryTime(${i}, 'ende', -15)">-</button>
                <div class="time-display">${e.ende}</div>
                <button class="btn-time-control" onclick="adjustEntryTime(${i}, 'ende', 15)">+</button>
            </div>

            <button class="btn-delete-item" onclick="if(confirm('Löschen?')){ zeiterfassung.splice(${i}, 1); renderZeiterfassungListe(); localStorage.setItem('gei_zeiterfassung', JSON.stringify(zeiterfassung)); }">🗑️</button>
        `;
        container.appendChild(row);
    });
}

function addManuellerEintrag() {
    if (!Array.isArray(zeiterfassung)) zeiterfassung = [];

    zeiterfassung.unshift({
        id: Date.now(),
        datum: new Date().toLocaleDateString('de-DE'),
        start: "08:00",
        ende: "16:00",
        notiz: ""
    });
    
    saveAndRefreshTime(); // Zeichnet alles neu, damit der neue Eintrag oben erscheint
}

function roundToQuarter(timeStr, direction) {
    let [h, m] = timeStr.split(':').map(Number);
    let totalMinutes = h * 60 + m;

    if (direction === 'down') {
        // Abrunden auf das vorherige Viertel
        totalMinutes = Math.floor(totalMinutes / 15) * 15;
    } else {
        // Aufrunden auf das nächste Viertel
        totalMinutes = Math.ceil(totalMinutes / 15) * 15;
    }

    let roundedH = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    let roundedM = (totalMinutes % 60).toString().padStart(2, '0');
    return `${roundedH}:${roundedM}`;
}

function openMonatsbericht() {
    const overlayBox = document.getElementById('overlay-box');
    const title = document.getElementById('overlay-titel');
    const content = document.getElementById('overlay-content');
    
    if (!overlayBox || !content) return;

    overlayBox.classList.add('overlay-fullscreen');
    content.classList.add('overlay-single-col');
    title.innerText = "Monatsbericht Zeiterfassung";
    
    // Die Steuerung und die 3 Buttons (Kopieren, Speichern, Zurück)
    content.innerHTML = `
        <div class="monats-steuerung" style="display:flex; justify-content:center; align-items:center; gap:15px; margin-bottom:15px;">
            <button class="btn-time-control" onclick="adjustBerichtMonat(-1)">-</button>
            <div id="monat-jahr-display" style="font-weight:bold; font-size:1.2rem; min-width:120px; text-align:center;">
                ${berichtMonat.toString().padStart(2,'0')}.${berichtJahr}
            </div>
            <button class="btn-time-control" onclick="adjustBerichtMonat(1)">+</button>
        </div>

        <div id="bericht-vorschau-container" style="flex-grow: 1; height: auto; overflow-y: auto; background:#000; border: 1px solid #2ecc71;">
            <div id="monats-bericht-text" class="matrix-text">Lade Daten...</div>
        </div>
        
        <div class="optionen-grid" style="grid-template-columns: 1fr 1fr; margin-top: 15px; gap: 10px;">
            <button class="btn-save" onclick="copyMonatsbericht()">📋 Kopieren</button>
            <button class="btn-save" style="background: linear-gradient(#3498db, #2980b9);" onclick="downloadBericht()">💾 Speichern</button>
            <button class="btn-back" onclick="closeMonatsbericht()" style="grid-column: span 2; height: 35px; margin-top:5px;">⬅️ Zurück</button>
        </div>
    `;

    document.getElementById('overlay').style.display = 'flex';
    renderMonatsBerichtLogik();
}

function adjustBerichtMonat(delta) {
    berichtMonat += delta;
    if (berichtMonat > 12) { berichtMonat = 1; berichtJahr++; }
    if (berichtMonat < 1) { berichtMonat = 12; berichtJahr--; }
    
    document.getElementById('monat-jahr-display').innerText = 
        `${berichtMonat.toString().padStart(2,'0')}.${berichtJahr}`;
    renderMonatsBerichtLogik();
}

function closeMonatsbericht() {
    const overlayBox = document.getElementById('overlay-box');
    overlayBox.classList.remove('overlay-fullscreen');
    closeOverlay(); // Ruft die Standard-Schließfunktion auf
}

function renderMonatsBerichtLogik() {
    const jetzt = new Date();
    const gesuchterMonat = berichtMonat;
    const gesuchtesJahr = berichtJahr;
    
    const tageNamen = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

    let gesamtMinutenSoll = 0;
    let gesamtMinutenIst = 0;

    // 1. SOLL-Stunden berechnen
    const tageImMonat = new Date(gesuchtesJahr, gesuchterMonat, 0).getDate();
    for (let d = 1; d <= tageImMonat; d++) {
        const datumObj = new Date(gesuchtesJahr, gesuchterMonat - 1, d);
        const wochentagName = tageNamen[datumObj.getDay()];
        const soll = sollzeiten[wochentagName];
        if (soll && soll.start !== soll.ende) {
            const [sH, sM] = soll.start.split(':').map(Number);
            const [eH, eM] = soll.ende.split(':').map(Number);
            gesamtMinutenSoll += (eH * 60 + eM) - (sH * 60 + sM);
        }
    }

    // 2. IST-Stunden filtern
    const monatsDaten = zeiterfassung.filter(e => {
        const parts = e.datum.split('.'); 
        return parseInt(parts[1]) === gesuchterMonat && parseInt(parts[2]) === gesuchtesJahr;
    });

    // --- SORTIERUNG (Chronologisch nach Tag und Uhrzeit) ---
    monatsDaten.sort((a, b) => {
        const dateA = a.datum.split('.').reverse().join('');
        const dateB = b.datum.split('.').reverse().join('');
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.start.localeCompare(b.start); // Falls mehrere Einträge am selben Tag
    });

    // 3. Bericht-Text aufbauen (mit Tabellenspalten)
    let berichtText = `=== MONATSBERICHT ZEITERFASSUNG ===\n`;
    berichtText += `Zeitraum: ${gesuchterMonat.toString().padStart(2,'0')}/${gesuchtesJahr}\n`;
    berichtText += `-----------------------------------------------------------\n`;
    // Spaltenköpfe mit festen Breiten: Datum (12), Von (8), Bis (8), Dauer (8), Notiz
    berichtText += `DATUM        VON      BIS      DAUER    ANMERKUNG\n`;
    berichtText += `-----------------------------------------------------------\n`;

    monatsDaten.forEach(e => {
        const [sH, sM] = e.start.split(':').map(Number);
        const [eH, eM] = e.ende.split(':').map(Number);
        const diff = (eH * 60 + eM) - (sH * 60 + sM);
        gesamtMinutenIst += diff;
        
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        const dauerStr = `${h}:${m.toString().padStart(2, '0')}h`;

        // Formatierung der Zeile mit padEnd für exakte Spaltenbreiten
        const colDatum = e.datum.padEnd(12);
        const colVon   = e.start.padEnd(8);
        const colBis   = e.ende.padEnd(8);
        const colDauer = dauerStr.padEnd(8);
        const colNote  = e.notiz || "";

        berichtText += `${colDatum} ${colVon} ${colBis} ${colDauer} ${colNote}\n`;
    });

    // 4. Zusammenfassung mit bündiger Ausrichtung
    const formatTimeOnly = (totalMins) => {
        const h = Math.floor(Math.abs(totalMins) / 60);
        const m = Math.abs(totalMins) % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const diffMins = gesamtMinutenIst - gesamtMinutenSoll;
    const diffVorzeichen = diffMins >= 0 ? "+" : "-";

    berichtText += `-----------------------------------------------------------\n`;
    // IST und SOLL bekommen ein Leerzeichen an der Stelle, wo unten das Vorzeichen steht
    berichtText += `GESAMT IST:        ${formatTimeOnly(gesamtMinutenIst).padStart(8)} h\n`;
    berichtText += `GESAMT SOLL:       ${formatTimeOnly(gesamtMinutenSoll).padStart(8)} h\n`;
    
    // DIFFERENZ: Vorzeichen direkt vor die Zahl, bündig mit den Werten darüber
    berichtText += `DIFFERENZ:        ${diffVorzeichen} ${formatTimeOnly(diffMins).padStart(7)} h\n`;
    berichtText += `-----------------------------------------------------------\n`;
    
    const display = document.getElementById('monats-bericht-text');
    if (display) display.innerText = berichtText;
}


function copyMonatsbericht() {
    const text = document.getElementById('monats-bericht-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Bericht in Zwischenablage kopiert!");
    });
}

function downloadBericht() {
    const text = document.getElementById('monats-bericht-text').innerText;
    const dateiName = `Gei_Bericht_${berichtJahr}_${berichtMonat.toString().padStart(2,'0')}.txt`;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', dateiName);

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}