# ⚽ Editor video RĂZVAN

Aplicație React (Vite) pentru editarea clipurilor de fotbal: pui emoji, stickere,
text și muzică peste video, apoi salvezi un fișier MP4 gata de urcat pe YouTube.

## Ce îți trebuie (o singură dată)

1. **Node.js** (versiunea 20 sau mai nouă): https://nodejs.org (alegi „LTS”).
2. **Visual Studio Code**: https://code.visualstudio.com
3. Browser **Google Chrome** sau **Microsoft Edge**.

## Cum pornești aplicația

1. Deschide Visual Studio Code.
2. **File → Open Folder…** și alege folderul `navzar-editor` de pe Desktop.
3. Deschide terminalul din VS Code: meniul **Terminal → New Terminal**.
4. Prima dată instalezi pachetele:

   ```bash
   npm install
   ```

5. Pornești aplicația:

   ```bash
   npm run dev
   ```

   Se deschide singură în browser la `http://localhost:5173`.
   Dacă nu se deschide, ține apăsat **Ctrl** și dă clic pe adresa din terminal.

6. Ca s-o oprești: clic în terminal și apasă **Ctrl + C**.

## Cum o folosești

1. **Deschide video**: butonul de sus sau tragi fișierul în fereastră.
2. Mergi la secunda dorită (bara de timp sau săgețile ← →).
3. Din stânga alegi:
   - **😀 Emoji**: un clic și apare pe video.
   - **🖼️ Stickere**: stickerele RĂZVAN sau un PNG de-al tău.
   - **🔤 Text**: scrii, apeși „Adaugă text”, iar culoarea o alegi din dreapta.
   - **🎵 Muzică**: cauți muzică gratuită online (scrii un cuvânt în engleză, de ex. „energetic”,
     asculți cu ▶ și apeși „Folosește”) sau alegi un MP3 de pe calculator. Alegi apoi de la ce secundă pornește, volumul, repetarea,
     intrarea lină și stingerea la final. Tot aici reglezi volumul sunetului din video.
   - **✂️ Taie**: alegi de unde până unde păstrezi clipul și scoți bucăți din mijloc
     („De la” / „Până la”, cu butonul „acum”, apoi „Taie bucata”). Bucățile tăiate apar hașurate
     pe bara de timp și sunt sărite la redare și la salvare. Video-ul original nu se schimbă.
4. Tragi elementele cu mouse-ul. **Pătrățelul galben** din colț sau **rotița mouse-ului** le mărește.
5. Din dreapta alegi **când apare / când dispare** (butonul „acum” ia secunda curentă) și **animația**.
6. **💾 Salvează video**: video-ul rulează o dată de la cap la coadă și se descarcă
   `razvan-AAAALLZZ-OOMM.mp4`. Nu minimiza fereastra cât se salvează.

Scurtături: **Spațiu** = play/pauză, **Delete** = șterge elementul selectat,
**← →** = 0,1 secunde înapoi/înainte (cu **Shift** câte 1 secundă).

## Muzica și drepturile de autor

Folosește doar muzică fără drepturi de autor, altfel YouTube poate bloca sau demonetiza clipul.
Căutarea online din editor (prin Openverse: Jamendo, Freesound, Wikimedia) arată doar melodii
cu licențe care permit folosirea pe YouTube, inclusiv monetizat. La cele cu licență **CC BY** sau
**CC BY-SA** editorul îți dă un text cu autorul: copiază-l în descrierea clipului.
Muzică gratuită găsești și în **YouTube Studio → Bibliotecă audio**.

## Pe telefon

Telefonul și calculatorul trebuie să fie pe același Wi-Fi:

```bash
npm run dev -- --host
```

În terminal apare o adresă de tip `http://192.168.x.x:5173`. O deschizi în Chrome pe telefon.
Pe telefon editarea merge mai greu decât pe calculator.

## Cum e făcut proiectul

```
src/
  App.jsx               starea aplicației (video, elemente, muzică, salvare)
  App.css               aspectul
  components/
    Header.jsx          bara de sus (deschide / salvează)
    ToolPanel.jsx       stânga: Emoji, Stickere, Text, Muzică
    MusicPanel.jsx      setările pentru muzică
    OnlineMusic.jsx     căutarea de muzică gratuită online
    Stage.jsx           video-ul (mutare și mărire cu mouse-ul)
    Timeline.jsx        play, bara de timp, benzile elementelor
    Inspector.jsx       dreapta: setările elementului selectat
    ExportDialog.jsx    fereastra „Se salvează…”
  lib/
    render.js           desenarea pe canvas și animațiile
    audio.js            amestecul sunet video + muzică
    exportVideo.js      salvarea în MP4/WEBM
    stickers.js         lista stickerelor RĂZVAN
    constants.js        emoji-uri, animații, fonturi
  assets/stickere/      PNG-urile stickerelor
```

**Sticker nou permanent:** pune PNG-ul în `src/assets/stickere/`, apoi adaugă-l în `src/lib/stickers.js`.
**Emoji nou:** adaugă-l în lista `EMOJIS` din `src/lib/constants.js`.

Pentru o versiune finală, care se poate pune pe un site:

```bash
npm run build
```

Rezultatul apare în folderul `dist/`.
