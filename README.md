# PokeArena

Combat de figurines Pokémon en **2.5D** dans le navigateur — data live **PokéAPI**.

| | |
|---|---|
| **Prod** | https://arena-poke.vercel.app |
| **Stack** | Vite · TypeScript · Phaser 3 · PokéAPI |

## Jouer

```bash
npm install
npm run dev
```

→ http://localhost:5173

### Contrôles

| Action | Clavier | Tactile |
|--------|---------|---------|
| Déplacement | ZQSD / WASD / flèches | Stick virtuel |
| Attaque | Auto au contact | Auto |
| Choisir capacité | Touches **1–4** | — |
| Capture | **C** | Bouton BALL |
| Soin / Rappel | **H** | Bouton SOIN |

## Contenu PokéAPI

- `/pokemon` — 6 stats, sprites artwork (+ shiny), cris, moveset level-up
- `/pokemon-species` — noms FR, descriptions Pokédex, taux de capture, légendaires
- `/move` — puissance, précision, type, classe physique/spéciale
- `/type` — table d’efficacité (STAB + super/peu efficace / immunité)
- `/ability` — talent affiché en FR
- `/evolution-chain` — évolutions par niveau

## Boucle de jeu

1. Choisir un starter → Centre Pokémon (équipe, boutique, Pokédex)
2. Arène : 15 vagues, boss toutes les 5, types & capacités réels
3. Capture aux Balls, XP / niveaux / évolutions, meta-progression (gens)

Fan game non commercial, non affilié à Nintendo / Game Freak / The Pokémon Company.
