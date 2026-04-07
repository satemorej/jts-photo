# JTS Photo — PWA chantier (Vue 3 + Vite + Backend dédié)

## 🎯 Objectif

Application PWA iPhone pour gestion de photos chantier :

* prise de photos
* ajout de notes
* consultation (viewer)
* upload vers NAS via API backend
* gestion offline + retry

---

# 🧱 Stack technique

## Frontend

* Vue 3 + Vite
* Pinia (state management)
* IndexedDB (stockage local)
* Service Worker (offline)
* jsPDF (rapport PDF)

## Backend (spécifique à cette application)

* API REST (Node.js ou PHP)
* Gestion upload fichiers
* Interface avec NAS Synology

---

# 📱 Contraintes plateforme (CRITIQUE)

* iOS Safari + PWA standalone
* Gestion safe-area (notch + bottom)
* Aucun scroll horizontal
* Un seul scroll vertical par écran
* Interactions tactiles fluides :

  * pas de conflit tap / scroll
* Zones tactiles min 44px
* Optimisé usage une main

---

# 🧭 Navigation / Flux utilisateur

ScreenNewJob (s1)
→ création session
→ ScreenSession (s2)

ScreenSession (s2)
→ prise photos
→ ajout notes
→ viewer
→ accès upload

ScreenUpload (s3)
→ envoi vers backend API
→ succès → terminé
→ échec → ScreenQueue (s4)

ScreenQueue (s4)
→ retry upload via backend

ScreenResume (s0)
→ reprise session

---

# 🧠 Data model

## ST_SESSION (IndexedDB)

* id
* date
* chantierName
* photos[] :

  * id
  * file (blob)
  * thumbnail
  * notes[]
* status

## ST_QUEUE (IndexedDB)

* id
* file
* type (photo / note)
* retryCount
* lastAttempt

---

# ⚙️ Règles métier

## Frontend

* Photo prise :
  → stockée localement
  → thumbnail générée

* Note :
  → attachée à photo

* Upload :
  → envoyé au backend API
  → succès → marqué comme uploadé
  → échec → ajouté à ST_QUEUE

## Backend

* reçoit fichiers (photo / note)
* valide données
* renomme fichiers si nécessaire
* stocke sur NAS :

  * photos → /volume1/photo/photos-jts/
  * notes → /volume1/JTSAGENCEMENT/1-CHANTIERS/_inbox/
* retourne statut JSON

---

# 🔌 API Backend

## Endpoint principal

POST /api/upload/photo
POST /api/upload/note

## Format requête

* multipart/form-data
* file (blob)
* metadata :

  * sessionId
  * chantierName
  * timestamp

## Réponse

```json
{ "success": true }
```

## Gestion erreurs

```json
{ "success": false, "error": "message" }
```

---

# ⚠️ Cas limites

* Pas de réseau :
  → stockage local uniquement

* Upload échoue :
  → ajout à ST_QUEUE

* Backend indisponible :
  → retry ultérieur

* Fichier déjà existant :
  → éviter duplication (hash ou nom unique)

---

# 📸 Gestion images

* stockage local full size
* thumbnail via canvas
* optimisation iPhone

---

# 🖥️ UI / UX règles

## Layout

* header safe-area
* zone centrale scrollable
* footer actions fixe

## Scroll

* un seul scroll vertical
* aucun scroll horizontal

## Interaction critique

* liste scrollable toujours fluide
* aucun blocage du scroll par JS

---

# 🔁 Événements utilisateurs

* tap photo → viewer
* bouton upload → appel API backend
* bouton retry → retry via API

---

# 🧱 Architecture recommandée

## Frontend

### Components

* GalleryGrid
* GalleryViewer
* NoteModal
* NetBar

### Screens

* ScreenResume
* ScreenNewJob
* ScreenSession
* ScreenUpload
* ScreenQueue

### Stores

* sessionStore
* queueStore
* uiStore

### Services

* db.ts (IndexedDB)
* api.ts (communication backend)
* pdfReport.ts

---

## Backend

### Structure

```text
/backend
  /routes
    upload.js
  /services
    storage.js
  server.js
```

### Responsabilités

* recevoir fichiers
* valider
* stocker NAS
* répondre JSON

---

# 🚀 Déploiement

## Frontend

* build Vite
* Service Worker versionné

## Backend

* déployé sur NAS ou serveur
* accessible via HTTPS
* même domaine recommandé (éviter CORS)

---

# ⚠️ Règles importantes

* ne jamais exposer NAS directement
* passer uniquement par API
* toujours gérer erreurs réseau
* ne pas bloquer UI pendant upload

---

# 🧪 Attentes Claude Code

* séparer frontend / backend
* créer API propre
* gérer erreurs réseau
* optimiser mobile iOS
* éviter bugs de scroll et interactions

---

# 🎯 Niveau attendu

Code production-ready :

* robuste
* modulaire
* maintenable
* optimisé terrain iPhone
