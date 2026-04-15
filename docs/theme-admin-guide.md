# Tema-sider – Administrationsvejledning

## Oversigt

Tema-sider (`/tema/energi`, `/tema/forsvar`, `/tema/miljoe`) genereres statisk fra JSON-konfigurationsfiler i `data/themes/`. En administrator kan styre hvilke temaer der er synlige ved at redigere disse filer.

---

## Publicer / afpublicer et tema

Hvert tema styres af en JSON-fil i `data/themes/`:

```
data/themes/
├── energi.json     ← /tema/energi
├── forsvar.json    ← /tema/forsvar
└── miljoe.json     ← /tema/miljoe
```

### Publicer et tema

Sæt `"published": true` i temafilen:

```json
{
  "slug": "energi",
  "published": true,
  ...
}
```

### Afpublicer et tema

Sæt `"published": false`:

```json
{
  "slug": "energi",
  "published": false,
  ...
}
```

**Vigtigt:** Ændringen kræver et nyt build (`npm run build`) for at træde i kraft, da sider genereres statisk.

---

## Opret et nyt tema

1. Opret en ny fil i `data/themes/`, f.eks. `data/themes/handel.json`
2. Brug dette skabelon-format:

```json
{
  "slug": "handel",
  "title": "International handel",
  "subtitle": "Afstemninger om handel, told og handelsaftaler",
  "heroImage": "/img/theme/handel/handel_hero.jpg",
  "published": true,
  "articleFilter": {
    "tags": ["Handelstema"],
    "maxArticles": 6
  },
  "visualisations": [
    {
      "title": "Liste over afstemninger",
      "description": "Se alle handelsrelaterede afstemninger",
      "href": "/latest-votes?search=handel&eurovoc=handelspolitik",
      "dataSource": {
        "file": "latest_votes.json",
        "search": "handel",
        "eurovoc": "handelspolitik"
      }
    },
    {
      "title": "Heatmap – gruppeenighed",
      "description": "Hvor enige er grupperne om handelsspørgsmål?",
      "href": "/heatmap?committee=INTA",
      "dataSource": {
        "file": "All_Pairwise_coalitions.json",
        "committee": "INTA"
      }
    },
    {
      "title": "Vindende koalitioner",
      "description": "Hvilke grupper vinder oftets handelsafstemninger?",
      "href": "/theme-winning-coalitions?committee=INTA&theme=International handel",
      "dataSource": {
        "file": "All_Winning_coalitions.json",
        "committee": "INTA"
      }
    }
  ]
}
```

3. Tilføj et hero-billede i `public/img/theme/handel/handel_hero.jpg`
4. Sørg for at artiklerne på WordPress er tagget med den tag der matcher `articleFilter.tags` (f.eks. "Handelstema")
5. Kør `npm run build` for at generere den nye temaside

---

## Konfigurationsfelter

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `slug` | string | URL-sti, skal matche filnavnet (uden `.json`) |
| `title` | string | Temaets overskrift, vist i hero-sektionen |
| `subtitle` | string | Underoverskrift i hero-sektionen |
| `heroImage` | string | Sti til hero-billede (relativ til `/public`) |
| `published` | boolean | **Styrer om temasiden genereres**. `false` = siden findes ikke |
| `articleFilter.tags` | string[] | WordPress-tags der matcher artikler til temaet |
| `articleFilter.maxArticles` | number | Max antal viste artikler (standard: 6) |
| `visualisations` | array | Liste af visualiseringskort vist på temasiden |

### Visualisation-objekt

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `title` | string | Korttitel |
| `description` | string | Kort beskrivelse |
| `href` | string | Link til visualiseringssiden med query-parametre |
| `dataSource.file` | string | JSON-fil der bruges til at generere underbeskrivelse |
| `dataSource.search` | string | Søgeord til filtrering af afstemninger |
| `dataSource.eurovoc` | string | Eurovoc-nøgleord til filtrering |
| `dataSource.committee` | string | Udvalgskode (f.eks. ITRE, SEDE, ENVI, INTA) |

---

## Tema → Udvalg mapping

Hvert tema er knyttet til ét primært parlamentsudvalg:

| Tema | Udvalg | Kode |
|------|--------|------|
| Energi og industri | Industri, forskning og energi | `ITRE` |
| Forsvar og sikkerhed | Sikkerhed og forsvar | `SEDE` |
| Miljø og klima | Miljø, folkesundhed og fødevaresikkerhed | `ENVI` |

Denne kobling bruges i `dataSource.committee` til at filtrere koalitions- og heatmap-data for det relevante udvalg.

---

## Artikel-integration

Tema-sider viser artikler fra WordPress i venstre kolonne via `ThemeArticles`-komponenten:

1. **Runtime**: Komponenten henter først direkte fra WordPress REST API
2. **Fallback**: Hvis WordPress er nede, bruges `data/articles.json` (genereret ved build-time)
3. **Filtrering**: Kun artikler med tags der matcher `articleFilter.tags` vises

For at en artikel vises på et tema:
- Artiklens tags på WordPress skal inkludere mindst ét tag fra `articleFilter.tags`
- Eksempel: En artikel tagget "Energi- og industritema" vises på `/tema/energi`

---

## Workflow: Opdatering af et tema

```
1. Rediger data/themes/{slug}.json
2. (Valgfrit) Tilføj/opdater hero-billede i public/img/theme/{slug}/
3. (Valgfrit) Tag nye artikler på WordPress med det relevante tag
4. Kør: npm run build
5. Deploy det nye /out output
```
