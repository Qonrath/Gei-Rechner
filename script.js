/* ==========================================================================
   1. GLOBALE VARIABLEN
   ========================================================================== */
let aktuellerBetrag = 0;
let artikelAnzahl = 0;
let transaktionsNummer = parseInt(localStorage.getItem('gei_nummer')) || 0;
let fahrerName = localStorage.getItem('gei_fahrer') || "CHEF";
let umsatzWare = parseFloat(localStorage.getItem('umsatzWare')) || 0;
let trinkgeldGesamt = parseFloat(localStorage.getItem('trinkgeldGesamt')) || 0;
let tagesStatistikProdukte = JSON.parse(localStorage.getItem('gei_strichliste')) || {};
let berichtErstellt = false;
let einstellungenGeaendert = false;

let produkte = [
    { name: "Semmerl", preis: 0.50, sichtbar: true },
    { name: "Salzgeb.", preis: 0.90, sichtbar: true },
    { name: "Vollkorn", preis: 1.10, sichtbar: true },
    { name: "Pizzast.", preis: 1.80, sichtbar: true },
    { name: "Käsegeb.", preis: 1.50, sichtbar: true },
    { name: "L-Käs", preis: 3.50, sichtbar: true },
    { name: "Schnitz.", preis: 4.50, sichtbar: true },
    { name: "Burger", preis: 4.80, sichtbar: true },
    { name: "Plunder", preis: 1.80, sichtbar: true },
    { name: "Kipferl", preis: 1.20, sichtbar: true },
    { name: "Brot", sichtbar: true, unterauswahl: [
        { name: "Hausbrot", preis: 3.80 }, { name: "Bauern", preis: 4.20 },
        { name: "Purpur", preis: 4.50 }, { name: "Buchweiz.", preis: 4.80 }
    ]},
    { name: "Trinken", sichtbar: true, unterauswahl: [
        { name: "RedBull", preis: 2.50 }, { name: "PET", preis: 1.80 },
        { name: "Kaffee", preis: 2.20 }, { name: "Wasser", preis: 1.20 }
    ]}
];

/* ==========================================================================
   2. START-UP LOGIK (Flackerfrei)
   ========================================================================== */
window.onload = function() {
    const saved = localStorage.getItem('gei_produkte');
    if (saved && saved !== "undefined") produkte = JSON.parse(saved);

    const headerAnzeige = document.getElementById('display-fahrer');
    if (headerAnzeige) headerAnzeige.innerText = fahrerName.toUpperCase();

    setupProduktButtons();
    updateUmsatzAnzeige(); 
    
    const tickerContainer = document.getElementById('ticker-liste');
    if (tickerContainer) tickerContainer.innerHTML = localStorage.getItem('gei_ticker_html') || "";

    // WICHTIG: Erst Navigation setzen, dann App zeigen
    navigation('main-view');

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

    updateClock();
    setInterval(updateClock, 1000);
};

/* ==========================================================================
   3. KERN-LOGIK
   ========================================================================== */
function addBetrag(preis, name) {
    aktuellerBetrag += preis;
    artikelAnzahl++;
    if (!tagesStatistikProdukte[name]) tagesStatistikProdukte[name] = 0;
    tagesStatistikProdukte[name]++;
    localStorage.setItem('gei_strichliste', JSON.stringify(tagesStatistikProdukte));
    updateDisplay();
}

function updateDisplay() {
    document.getElementById('rechnungs-betrag').innerText = aktuellerBetrag.toFixed(2) + " €";
    document.getElementById('btn-passend').innerText = "Σ: " + aktuellerBetrag.toFixed(2);
    
    let a50 = Math.ceil(aktuellerBetrag * 2) / 2; 
    if (a50 <= aktuellerBetrag) a50 += 0.5;
    let aEu = Math.ceil(aktuellerBetrag); 
    if (aEu <= aktuellerBetrag) aEu += 1.0;
    
    const b50 = document.getElementById('btn-auf50');
    const bEu = document.getElementById('btn-aufEuro');
    
    b50.innerText = `½→ ${a50.toFixed(2)}`;
    b50.onclick = () => verbuchen(a50 - aktuellerBetrag);
    bEu.innerText = `€→ ${aEu.toFixed(2)}`;
    bEu.onclick = () => verbuchen(aEu - aktuellerBetrag);
}

function verbuchen(tip = 0) {
    if (aktuellerBetrag <= 0) return;
    umsatzWare += aktuellerBetrag;
    trinkgeldGesamt += tip;
    transaktionsNummer++;

    const jetzt = new Date();
    const datum = jetzt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const zeit = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    const ticker = document.getElementById('ticker-liste');
    const eintrag = document.createElement('li');
    eintrag.innerHTML = `
        <span style="color:#f1c40f">🛒 #${transaktionsNummer}</span> 
        <span style="color:#888; font-size:0.8rem;">[${datum} ${zeit}]</span> 
        <span style="color:#ecf0f1">Art: ${artikelAnzahl}</span> | 
        <span style="color:#2ecc71; font-weight:bold;">Σ ${aktuellerBetrag.toFixed(2)}€</span> 
        <span style="color:#3498db; font-size:0.8rem;">(+${tip.toFixed(2)}€)</span>`;

    ticker.insertBefore(eintrag, ticker.firstChild);
    localStorage.setItem('gei_ticker_html', ticker.innerHTML);
    localStorage.setItem('gei_nummer', transaktionsNummer);
    
    resetAktuellerKunde();
    updateUmsatzAnzeige();
}

function resetAktuellerKunde() {
    aktuellerBetrag = 0; artikelAnzahl = 0;
    document.getElementById('rechnungs-betrag').innerText = "0.00 €";
    document.getElementById('btn-passend').innerText = "Σ: 0.00";
    document.getElementById('btn-auf50').innerText = "½→";
    document.getElementById('btn-aufEuro').innerText = "€→";
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
    produkte.filter(p => p.sichtbar).forEach(p => {
        let b = document.createElement('button');
        b.innerText = p.unterauswahl ? `${p.name} ▾` : `${p.name}\n${p.preis.toFixed(2)}€`;
        b.onclick = () => p.unterauswahl ? openOverlay(p.name, p.unterauswahl) : addBetrag(p.preis, p.name);
        container.appendChild(b);
    });
}

function openOverlay(titel, liste) {
    const contentEl = document.getElementById('overlay-content');
    document.getElementById('overlay-titel').innerText = titel;
    contentEl.innerHTML = "";
    liste.forEach(item => {
        let btn = document.createElement('button');
        btn.innerHTML = `${item.name}<br><small>${item.preis.toFixed(2)}€</small>`;
        btn.onclick = () => { addBetrag(item.preis, item.name); closeOverlay(); };
        contentEl.appendChild(btn);
    });
    document.getElementById('overlay').style.display = "flex";
}

function closeOverlay() { document.getElementById('overlay').style.display = "none"; }

function navigation(zielId) {
    if (einstellungenGeaendert && !confirm("Änderungen verwerfen?")) return;
    einstellungenGeaendert = false;
    
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const zielView = document.getElementById(zielId);
    if (zielView) zielView.style.display = 'block';
    
    const icons = document.querySelectorAll('.icon-btn');
    icons.forEach(i => i.classList.remove('active'));

    if (zielId === 'main-view') icons[0]?.classList.add('active');
    else if (zielId === 'stats-view') {
        icons[1]?.classList.add('active');
        const vorschau = document.getElementById('bericht-live-text');
        if (vorschau) vorschau.innerText = generiereBerichtText();
    } 
    else if (zielId === 'settings-view') {
        icons[2]?.classList.add('active');
        const inputFahrer = document.getElementById('input-fahrer');
        if (inputFahrer) inputFahrer.value = fahrerName;
        fillSettingsForm(); 
    }
}

function generiereBerichtText() {
    const datum = new Date().toLocaleDateString('de-DE');
    let b = `TAGESBERICHT: ${datum}\nFAHRER: ${fahrerName.toUpperCase()}\n`;
    b += `------------------------------------------\n`;
    b += `ARTIKEL         | ANZ | PREIS  | SUMME\n`;
    b += `------------------------------------------\n`;
    for (const [name, anz] of Object.entries(tagesStatistikProdukte)) {
        let p = getP(name);
        b += `${name.padEnd(15)} | ${anz.toString().padStart(3)} | ${p.toFixed(2).padStart(6)}€ | ${(p*anz).toFixed(2).padStart(7)}€\n`;
    }
    b += `------------------------------------------\n`;
    b += `WARE GESAMT:    ${umsatzWare.toFixed(2).padStart(10)} €\n`;
    b += `TRINKGELD:      ${trinkgeldGesamt.toFixed(2).padStart(10)} €\n`;
    b += `NETTO LOSUNG:   ${(umsatzWare + trinkgeldGesamt).toFixed(2).padStart(10)} €\n`;
    b += `KÄUFE: #${transaktionsNummer}`;
    return b;
}

function kopiereTagesbericht() {
    navigator.clipboard.writeText(generiereBerichtText()).then(() => { alert("Kopiert!"); berichtErstellt = true; });
}

function getP(n) {
    for (let p of produkte) {
        if (p.name === n && p.preis !== undefined) return p.preis;
        if (p.unterauswahl) {
            let sub = p.unterauswahl.find(s => s.name === n);
            if (sub) return sub.preis;
        }
    }
    return 0;
}

function updateClock() {
    const d = new Date();
    document.getElementById('live-date').innerText = d.toLocaleDateString();
    document.getElementById('live-time').innerText = d.toLocaleTimeString();
}

function neuerTagStarten() {
    let warnung = "Tag wirklich beenden? Alle Daten werden gelöscht!";
    if (!berichtErstellt && umsatzWare > 0) warnung = "⚠️ BERICHT NOCH NICHT KOPIERT!\n\n" + warnung;
    if(confirm(warnung)) {
        const f = localStorage.getItem('gei_fahrer');
        const p = localStorage.getItem('gei_produkte');
        localStorage.clear();
        if(f) localStorage.setItem('gei_fahrer', f);
        if(p) localStorage.setItem('gei_produkte', p);
        location.reload();
    }
}

function fillSettingsForm() {
    const f = document.getElementById('preis-editor');
    if(!f) return;
    f.innerHTML = "";
    produkte.forEach((p, i) => {
        if (!p.unterauswahl) {
            f.innerHTML += row(p.name, p.preis, i);
        } else {
            f.innerHTML += `<div class="view-title" style="color:#f1c40f; font-size:0.9rem;">${p.name}</div>`;
            p.unterauswahl.forEach((u, j) => {
                f.innerHTML += row(u.name, u.preis, `${i}-${j}`);
            });
        }
    });
}

function row(n, p, id) {
    return `<div style="display:flex; gap:5px; margin-bottom:5px">
        <input type="text" id="p-name-${id}" value="${n}" style="width:65%; background:#000; color:white; border:1px solid #34495e; padding:8px; border-radius:5px">
        <input type="number" step="0.1" id="p-preis-${id}" value="${p.toFixed(2)}" style="width:30%; background:#000; color:white; border:1px solid #34495e; padding:8px; border-radius:5px">
    </div>`;
}

function markAsDirty() { einstellungenGeaendert = true; }

function produkteSpeichern() {
    const inputFahrer = document.getElementById('input-fahrer');
    if (inputFahrer) localStorage.setItem('gei_fahrer', inputFahrer.value.trim() || "CHEF");
    produkte.forEach((p, i) => {
        if (!p.unterauswahl) {
            const n = document.getElementById(`p-name-${i}`);
            const pr = document.getElementById(`p-preis-${i}`);
            if(n) p.name = n.value;
            if(pr) p.preis = parseFloat(pr.value) || 0;
        } else {
            p.unterauswahl.forEach((sub, subIdx) => {
                const n = document.getElementById(`p-name-${i}-${subIdx}`);
                const pr = document.getElementById(`p-preis-${i}-${subIdx}`);
                if(n) sub.name = n.value;
                if(pr) sub.preis = parseFloat(pr.value) || 0;
            });
        }
    });
    localStorage.setItem('gei_produkte', JSON.stringify(produkte));
    alert("Gespeichert!");
    location.reload(); 
}