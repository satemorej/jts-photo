---
name: Toujours bumper le build après une évolution
description: Après chaque évolution livrée, incrémenter build.json et lancer le build pour forcer le rechargement du SW sur iPhone
type: feedback
---

Après avoir terminé une évolution (feature, fix, refacto), toujours bumper le build et forcer une mise à jour du service worker.

**Why:** Sur iPhone PWA, le SW ne se met à jour que si le fichier change. Sans bump, l'utilisateur reste sur l'ancienne version. Une évolution = un bump obligatoire.

**How to apply:** À la fin de chaque tâche livrée :
1. Incrémenter `build.json` (`n` + 1) — ou laisser `vite.config.ts` le faire via `npm run build`
2. Lancer `npm run build` (ou `npm run deploy:dev`) pour regénérer le SW avec le nouveau numéro
3. Le `vite.config.ts` auto-incrémente `build.json` à chaque build — donc un `deploy:dev` suffit
