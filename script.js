/* ==========================================================================
   1. GLOBALE VARIABLEN
   ========================================================================== */
let aktuellerBetrag = 0;
let artikelAnzahl = 0;
let transaktionsNummer = parseInt(localStorage.getItem('gei_nummer')) || 0;
let umsatzWare = parseFloat(localStorage.getItem('umsatzWare')) || 0;
let trinkgeldGesamt = parseFloat(localStorage.getItem('trinkgeldGesamt')) || 0;
let tagesStatistikProdukte = JSON.parse(localStorage.getItem('gei_strichliste')) || {};
let berichtErstellt = false;
let einstellungenGeaendert = false;
let zwischenliste = []; // Hält die aktuellen Produkte fest

/* ==========================================================================
   ZENTRALE KONFIGURATION (DIE QUELLE DER WAHRHEIT)
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

// Initialisierung der Variablen beim Start
let fahrerName = localStorage.getItem('gei_fahrer') || APP_DEFAULTS.fahrer;
let produkte = JSON.parse(localStorage.getItem('gei_produkte')) || JSON.parse(JSON.stringify(APP_DEFAULTS.produkte));

/* ==========================================================================
   2. START-UP LOGIK
   ========================================================================== */
window.onload = function() {
    // 1. Produkte sicher laden
    const saved = localStorage.getItem('gei_produkte');
    if (saved && saved !== "undefined" && saved !== "null") {
        try {
            produkte = JSON.parse(saved);
        } catch (e) {
            console.error("Fehler beim Parsen der Produkte:", e);
        }
    }

    // 2. Fahrer laden
    const savedFahrer = localStorage.getItem('gei_fahrer');
    if (savedFahrer) fahrerName = savedFahrer;

    const headerAnzeige = document.getElementById('display-fahrer');
    if (headerAnzeige) headerAnzeige.innerText = fahrerName.toUpperCase();

    // 3. UI & Uhr Initialisieren
    setupProduktButtons();
    updateUmsatzAnzeige();
    updateClock();
    setInterval(updateClock, 1000);
    
    const tickerContainer = document.getElementById('ticker-liste');
    if (tickerContainer) {
        tickerContainer.innerHTML = localStorage.getItem('gei_ticker_html') || "";
    }

    navigation('main-view');

    // Splash-Screen Handling
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.querySelector('.app-container');
        if (splash) splash.style.opacity = '0';
        setTimeout(() => { 
            if(splash) splash.style.display = 'none';
            if(app) { 
                app.style.display = 'block'; 
                setTimeout(() => app.style.opacity = '1', 50); 
            }
        }, 500);
    }, 800);
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
    
    // Nur sichtbare Produkte verarbeiten
    const sichtbareProdukte = produkte.filter(p => p.sichtbar !== false);

    sichtbareProdukte.forEach(p => {
        const b = document.createElement('button');
        
        if (p.unterauswahl && Array.isArray(p.unterauswahl)) {
            // FALL A: Es ist eine Gruppe
            b.innerText = `${p.name} ▾`;
            b.onclick = () => openOverlay(p.name, p.unterauswahl);
        } else {
            // FALL B: Es ist ein Einzelprodukt
            // Sicherheit: Falls Preis fehlt, nimm 0
            const preisSicher = typeof p.preis === 'number' ? p.preis : 0;
            b.innerText = `${p.name}\n${preisSicher.toFixed(2)}€`;
            b.onclick = () => addBetrag(preisSicher, p.name);
        }
        
        container.appendChild(b);
    });
}


function openOverlay(titel, liste) {
    const contentEl = document.getElementById('overlay-content');
    document.getElementById('overlay-titel').innerText = titel;
    contentEl.innerHTML = "";

    const sichtbareListe = liste.filter(item => item.sichtbar !== false);
    sichtbareListe.forEach(item => {
        let btn = document.createElement('button');
        btn.innerHTML = `${item.name}<br><small>${item.preis.toFixed(2)}€</small>`;
        btn.onclick = () => { addBetrag(item.preis, item.name); closeOverlay(); };
        contentEl.appendChild(btn);
    });
    document.getElementById('overlay').style.display = "flex";
}

function closeOverlay() { document.getElementById('overlay').style.display = "none"; }

function navigation(zielId) {
  
  // SPERRE: Wenn noch unbezahlte Artikel da sind
    if (zwischenliste.length > 0 && zielId !== 'main-view') {
        alert("⚠️ Bitte erst den aktuellen Verkauf abschließen oder mit 'C' löschen!");
        return; 
    }

    if (einstellungenGeaendert && !confirm("Änderungen verwerfen?")) return;
    einstellungenGeaendert = false;

    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');

    const zielView = document.getElementById(zielId);

    if (zielView) zielView.style.display = 'block';

    
    const icons = document.querySelectorAll('.icon-btn');
    icons.forEach(i => i.classList.remove('active'));


    if (zielId === 'main-view') {

        icons[0]?.classList.add('active');

        setupProduktButtons(); 

    } else if (zielId === 'stats-view') {

        icons[1]?.classList.add('active');

        const vorschau = document.getElementById('bericht-live-text');

        if (vorschau) vorschau.innerText = generiereBerichtText();

    } else if (zielId === 'settings-view') {

        icons[2]?.classList.add('active');

        const inputFahrer = document.getElementById('input-fahrer');

        if (inputFahrer) inputFahrer.value = fahrerName;

        fillSettingsForm(); 

    }

}

/* ==========================================================================
   5. SETTINGS & EDITOR (MODULAR)
   ========================================================================== */
function erzeugeProduktZeile(item, id, isSub = false) {
    const row = document.createElement('div');
    row.className = "produkt-row";
    row.dataset.id = id;
    
    // Styling der Zeile
    row.style.display = "flex";
    row.style.gap = "5px";
    row.style.marginBottom = "8px";
    row.style.alignItems = "center";
    row.style.background = isSub ? "rgba(255,255,255,0.03)" : "transparent";
    row.style.padding = isSub ? "5px" : "0";
    row.style.borderRadius = "8px";

    // 1. Drag-Handle
    const handle = document.createElement('div');
    handle.className = "drag-handle";
    handle.innerHTML = "☰";
    handle.style.cursor = "grab";
    handle.style.padding = "10px";
    handle.style.color = "#555";
    handle.style.fontSize = "1.2rem";

    // 2. Sichtbarkeit Checkbox
    const cb = document.createElement('input');
    cb.type = "checkbox";
    cb.checked = item.sichtbar !== false;
    cb.id = `p-sichtbar-${id}`;
    cb.onchange = () => {
        item.sichtbar = cb.checked;
        markAsDirty();
    };

    // 3. Name Input
    const nameInp = document.createElement('input');
    nameInp.type = "text";
    nameInp.value = item.name;
    nameInp.id = `p-name-${id}`;
    nameInp.style.width = "50%";
    nameInp.style.background = "#000";
    nameInp.style.color = "white";
    nameInp.style.border = "1px solid #34495e";
    nameInp.style.padding = "8px";
    nameInp.style.borderRadius = "5px";
    nameInp.oninput = markAsDirty;

    // 4. Preis Input
    const priceInp = document.createElement('input');
    priceInp.type = "number";
    priceInp.step = "0.01";
    priceInp.value = item.preis ? item.preis.toFixed(2) : "0.00";
    priceInp.id = `p-preis-${id}`;
    priceInp.style.width = "25%";
    priceInp.style.background = "#000";
    priceInp.style.color = "white";
    priceInp.style.border = "1px solid #34495e";
    priceInp.style.padding = "8px";
    priceInp.style.borderRadius = "5px";
    priceInp.oninput = markAsDirty;

    // 5. Lösch-Button mit sauberer Logik
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "🗑️";
    delBtn.style.width = "35px";
    delBtn.style.height = "35px";
    delBtn.style.background = "rgba(214, 48, 49, 0.2)";
    delBtn.style.border = "1px solid #d63031";
    delBtn.style.color = "#ff7675";
    delBtn.style.borderRadius = "5px";
    delBtn.style.cursor = "pointer";

    delBtn.onclick = () => {
        const parts = id.toString().split('-');
        
        if (parts.length > 1) {
            // Es ist ein Unterprodukt (z.B. "3-1")
            const hauptIndex = parseInt(parts[0], 10);
            const unterIndex = parseInt(parts[1], 10);
            produktLoeschen(hauptIndex, unterIndex);
        } else {
            // Es ist ein Hauptprodukt (z.B. "3")
            const hauptIndex = parseInt(id, 10);
            produktLoeschen(hauptIndex);
        }
    };

    // Zusammenbauen
    row.appendChild(handle);
    row.appendChild(cb);
    row.appendChild(nameInp);
    row.appendChild(priceInp);
    row.appendChild(delBtn);

    return row;
}

function fillSettingsForm() {
    const container = document.getElementById('preis-editor');
    if (!container) return;
    container.innerHTML = "";

    produkte.forEach((p, i) => {
        if (!p.unterauswahl) {
            container.appendChild(erzeugeProduktZeile(p, i));
        } else {
            const catBox = document.createElement('div');
            catBox.className = "category-group";
            catBox.style = "background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; margin-bottom: 15px; border: 1px dashed #555;";

            const catHeader = document.createElement('div');
            catHeader.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";
            catHeader.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="drag-handle" style="color:#f1c40f; cursor:grab;">☰</div>
                    <input type="text" class="cat-title-input" value="${p.name}" 
                           style="background:rgba(0,0,0,0.3); border:1px solid #444; color:#f1c40f; font-weight:bold; width:180px; padding:5px; border-radius:4px;"
                           oninput="markAsDirty()">
                </div>
                <button onclick="produktLoeschen(${i})" style="width:35px; height:35px; background:rgba(192, 57, 43, 0.2); color:#e74c3c; border:1px solid #c0392b; border-radius:5px;">🗑️</button>`;

            const subContainer = document.createElement('div');
            subContainer.className = "sub-sortable";
            subContainer.style = "min-height: 40px; padding: 5px; border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; background: rgba(0,0,0,0.1);";

            p.unterauswahl.forEach((u, j) => {
                subContainer.appendChild(erzeugeProduktZeile(u, `${i}-${j}`, true));
            });

            catBox.append(catHeader, subContainer);
            container.appendChild(catBox);

            new Sortable(subContainer, {
                group: { name: 'shared', put: (to, from, dragEl) => !dragEl.classList.contains('category-group') },
                animation: 150, handle: '.drag-handle', ghostClass: 'sortable-ghost', onEnd: markAsDirty
            });
        }
    });

    new Sortable(container, {
        group: { name: 'shared', put: true },
        animation: 150, handle: '.drag-handle', ghostClass: 'sortable-ghost', onEnd: markAsDirty
    });
}

function leseAktuelleSortierung() {
    const neuerStand = [];
    const editor = document.getElementById('preis-editor');
    if(!editor) return produkte;

    editor.childNodes.forEach(node => {
        if (node.classList && node.classList.contains('category-group')) {
            const catName = node.querySelector('.cat-title-input').value;
            const subContainer = node.querySelector('.sub-sortable');
            const unterliste = [];
            subContainer.childNodes.forEach(subNode => {
                if (subNode.classList.contains('produkt-row')) unterliste.push(extrahiereDatenAusZeile(subNode));
            });
            neuerStand.push({ name: catName, sichtbar: true, unterauswahl: unterliste });
        } else if (node.classList && node.classList.contains('produkt-row')) {
            neuerStand.push(extrahiereDatenAusZeile(node));
        }
    });
    return neuerStand;
}

function extrahiereDatenAusZeile(row) {
    const id = row.dataset.id;
    return {
        name: document.getElementById(`p-name-${id}`).value,
        preis: parseFloat(document.getElementById(`p-preis-${id}`).value) || 0,
        sichtbar: document.getElementById(`p-sichtbar-${id}`).checked
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

function produkteSpeichern() {
    const inputFahrer = document.getElementById('input-fahrer');
    if (inputFahrer) {
        fahrerName = inputFahrer.value.trim() || "CHEF";
        localStorage.setItem('gei_fahrer', fahrerName);
    }
    produkte = leseAktuelleSortierung();
    localStorage.setItem('gei_produkte', JSON.stringify(produkte));
    einstellungenGeaendert = false;
    fillSettingsForm();
    setupProduktButtons();
    alert("Gespeichert!");
}

function neuesProduktHinzufuegen() {
    produkte.unshift({ name: "NEUES PRODUKT", preis: 0.00, sichtbar: true });
    fillSettingsForm(); markAsDirty();
}

function neueGruppeHinzufuegen() {
    produkte.unshift({ name: "NEUE GRUPPE", sichtbar: true, unterauswahl: [] });
    fillSettingsForm(); markAsDirty();
}

function produktLoeschen(index, subIndex = null) {
    if (!confirm("Dieses Produkt wirklich löschen?")) return;

    if (subIndex === null) {
        // Fall 1: Ein Hauptprodukt löschen
        produkte.splice(index, 1);
    } else {
        // Fall 2: Ein Unterprodukt aus einer Gruppe löschen
        // Wir prüfen vorher, ob die Gruppe überhaupt existiert
        if (produkte[index] && produkte[index].unterauswahl) {
            produkte[index].unterauswahl.splice(subIndex, 1);
        }
    }

    // UI aktualisieren
    fillSettingsForm(); 
    markAsDirty();
}

function markAsDirty() { einstellungenGeaendert = true; }

/* ==========================================================================
   6. STATISTIK & BACKUP
   ========================================================================== */
function generiereBerichtText() {
    const datum = new Date().toLocaleDateString('de-DE');
    let b = `TAGESBERICHT: ${datum}\n`;
    b += `FAHRER: ${fahrerName.toUpperCase()}\n`;
    b += `------------------------------------------\n`;
    b += `ARTIKEL         | ANZ | PREIS  | SUMME\n`;
    b += `------------------------------------------\n`;
    
    for (const [name, anz] of Object.entries(tagesStatistikProdukte)) {
        let p = getP(name);
        let summe = p * anz;
        b += `${name.padEnd(15)} | ${anz.toString().padStart(3)} | ${p.toFixed(2).padStart(6)}€ | ${summe.toFixed(2).padStart(7)}€\n`;
    }
    
    b += `------------------------------------------\n`;
    b += `WARE GESAMT:    ${umsatzWare.toFixed(2).padStart(10)} €\n`;
    b += `TRINKGELD:      ${trinkgeldGesamt.toFixed(2).padStart(10)} €\n`;
    b += `NETTO LOSUNG:   ${(umsatzWare + trinkgeldGesamt).toFixed(2).padStart(10)} €\n`;
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