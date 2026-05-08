# Tema-use-case: Hvordan `theme_votes_*.json` vælges via URL-parametre

Dette dokument beskriver brugerflowet fra en tema-side til en filtreret
liste over en MEP's afstemninger og forklarer **udelukkende**:

1. Hvilken `theme_votes_*.json`-fil hver side læser.
2. Hvordan URL-parametrene `search` og `eurovoc` afgør valget.
3. Hvor de URL-parametre kommer fra (henvisende side).

Eksempel-flow brugt herunder: tema **forsvar** → MEP **Storm**.

---

## Use-case-trin

1. Bruger åbner `/tema/forsvar`.
2. Bruger klikker visualiseringskortet **"Danske MEP'er"** og lander på
   `/danish-mep-votes?search=forsvar&eurovoc=forsvarspolitik`.
3. Bruger udvider en MEP (fx "Storm") og klikker
   **"Se seneste afstemninger"**.
4. Bruger lander på
   `/latest-votes?mep=Storm&search=forsvar&eurovoc=forsvarspolitik`.

---

## Datasæt-valg pr. tema

Mappet `THEME_DATASETS` i [lib/theme-datasets.ts](../lib/theme-datasets.ts)
er den eneste sandhed for hvilken fil hører til hvilken `(search, eurovoc)`
kombination:

| URL-kombi (`search` + `eurovoc`) | Fil |
| --- | --- |
| `forsvar` + `forsvarspolitik` | [data/theme_votes_forsvar_sikkerhed.json](../data/theme_votes_forsvar_sikkerhed.json) |
| `miljø` + `miljøpolitik` | [data/theme_votes_miljo_sundhed.json](../data/theme_votes_miljo_sundhed.json) |
| `energi` + `energipolitik` | [data/theme_votes_energi_industri.json](../data/theme_votes_energi_industri.json) |

Funktionen `matchThemeDataset(search, eurovoc)` slår op i mappet og
returnerer enten en entry (tema-mode) eller `null` (fallback).

---

## Trin 1 → 2: `/tema/forsvar` sætter URL-parametrene

[data/themes/forsvar.json](../data/themes/forsvar.json) definerer kortet
"Danske MEP'er" med en hardkodet `href` der **er** kilden til parametrene:

```jsonc
{
  "title": "Danske MEP'er",
  "href": "/danish-mep-votes?search=forsvar&eurovoc=forsvarspolitik"
}
```

→ Når brugeren klikker kortet, sender browseren `search=forsvar` og
`eurovoc=forsvarspolitik` videre i URL'en.

Tilsvarende for de to andre temaer:

| Tema-konfig | href på "Danske MEP'er"-kortet |
| --- | --- |
| [data/themes/miljoe.json](../data/themes/miljoe.json) | `/danish-mep-votes?search=miljø&eurovoc=miljøpolitik` |
| [data/themes/energi.json](../data/themes/energi.json) | `/danish-mep-votes?search=energi&eurovoc=energipolitik` |

---

## Trin 2: `/danish-mep-votes` læser URL og vælger tema-fil

I [components/danish-mep-votes-chart.tsx](../components/danish-mep-votes-chart.tsx):

```ts
const searchFilter  = searchParams.get("search");   // "forsvar"
const eurovocFilter = searchParams.get("eurovoc");  // "forsvarspolitik"

const themeDataset = matchThemeDataset(searchFilter, eurovocFilter);
const votesUrl = themeDataset
  ? `${basePath}/data/${themeDataset.file}`         // theme_votes_forsvar_sikkerhed.json
  : `${basePath}/data/latest_votes.json`;           // fallback
```

→ For forsvars-flowet hentes
[data/theme_votes_forsvar_sikkerhed.json](../data/theme_votes_forsvar_sikkerhed.json).
Filens `vote_id`-liste definerer "i temaet"; brud-records vises kun for
afstemninger hvis `vote_id` findes i filen.

---

## Trin 3 → 4: `/danish-mep-votes` viderefører parametrene

Når brugeren klikker "Se seneste afstemninger" på en MEP, bygges URL'en
ved at videresende de **samme** `search`/`eurovoc` parametre plus MEP'ens
familienavn:

```ts
const params = new URLSearchParams();
params.set("mep", s.mep.family_name);                 // "Storm"
if (searchFilter)  params.set("search",  searchFilter);
if (eurovocFilter) params.set("eurovoc", eurovocFilter);
return `/latest-votes?${params.toString()}`;
```

→ `/latest-votes?mep=Storm&search=forsvar&eurovoc=forsvarspolitik`.

---

## Trin 4: `/latest-votes` læser URL og vælger samme tema-fil

I [app/latest-votes/page.tsx](../app/latest-votes/page.tsx) bruges
**samme** `matchThemeDataset()` fra det delte modul:

```ts
const themeDataset = matchThemeDataset(
  searchParams.get("search"),
  searchParams.get("eurovoc"),
);
const url = themeDataset
  ? `/${basePath}/data/${themeDataset.file}`        // theme_votes_forsvar_sikkerhed.json
  : `/${basePath}/data/latest_votes.json`;
```

→ Begge sider arbejder garanteret på samme `theme_votes_*.json`-fil for
samme tema. Bruger ser kun forsvars-afstemninger hvor Storm har stemt
imod sin gruppe.

---

## Sammenfattende parameter-flow

```
data/themes/forsvar.json
    href: "/danish-mep-votes?search=forsvar&eurovoc=forsvarspolitik"
            │
            ▼  (klik på "Danske MEP'er"-kortet)
/danish-mep-votes?search=forsvar&eurovoc=forsvarspolitik
    matchThemeDataset("forsvar","forsvarspolitik")
        ─► theme_votes_forsvar_sikkerhed.json
            │
            ▼  (klik på "Se seneste afstemninger" – parametre videreført)
/latest-votes?mep=Storm&search=forsvar&eurovoc=forsvarspolitik
    matchThemeDataset("forsvar","forsvarspolitik")
        ─► theme_votes_forsvar_sikkerhed.json   (samme fil)
```

Skal et nyt tema understøttes ændres kun to steder:

1. Tilføj entry i `THEME_DATASETS` ([lib/theme-datasets.ts](../lib/theme-datasets.ts)).
2. Sæt matchende `href` i tema-konfigurationen under
   [data/themes/](../data/themes/).

## Krydsreferencer

- Tema-konfiguration og admin: [theme-admin-guide.md](./theme-admin-guide.md).
- Build- og runtime-pipeline: [build-and-data-pipeline.md](./build-and-data-pipeline.md).
- Visuelle diagrammer: [diagrams.html](./diagrams.html).
