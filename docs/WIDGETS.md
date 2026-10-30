# Widgets (eget dashboard)

Et widget-layout er en lille liste af elementer (højst 16): tekst, tal, bjælker, ringe, rammer og tilstandsknapper.
Det kompileres i appen til højst 360 bytes og sendes til boardet, som validerer alt igen, før det gemmes.

**Altid på skærmen, uanset layout:** overskriften (BLE-status, DEMO/LIVE/NO DATA, telefon), SET-knappen og swipe-op til 20 km/t-skærmen. Elementer må ikke ligge over y = 30, så de ikke kan skjule dem.
Værdier vises kun, når hjulet har meldt dem; ellers står der `--`.

## Format (JSON)
```json
{"v":1,"name":"Mit dashboard","author":"Dit navn","desc":"kort tekst","items":[
 {"t":"ring","x":88,"y":126,"r":80,"th":14,"src":"speed","max":35,"color":"neon"},
 {"t":"num","x":88,"y":118,"src":"speed","font":"8","align":"center","dp":0,"color":"text"},
 {"t":"text","x":88,"y":158,"text":"km/h","font":"4","align":"center","color":"dim"},
 {"t":"bar","x":184,"y":80,"w":122,"h":8,"src":"power","max":1000,"color":"neon"},
 {"t":"modebar"}]}
```
* `t`: `text`, `num`, `bar`, `ring`, `rect`, `modebar`
* `src`: `speed power battery volt current temp motortemp trip total mode fault`
* `font`: `2`, `4` (tekst og tal), `6`, `7`, `8` (kun tal), `align`: `left center right`, `color`: `text neon ok warn bad dim panel`
* `unit`: tekst efter et tal (fx `" km"`, `"%"`), `dp`: decimaler 0–2
* Ring: `x,y` = midte, `r` radius 20–100, `th` tykkelse 4–30. Bjælke: `w` 8–320, `h` 3–40. `max` = værdi ved fuld bjælke/ring.

## Start-widgets
`app/widgets/starter/`: Classic ring, Big speed, Power focus, Minimal.

## Del en widget på siden
1. I web-appen: Widgets → Editor → **Del på siden**. Det åbner en færdigudfyldt GitHub-side (issue) med din widget.
2. Du som ejer tilføjer mærket **approved** på issuet. Workflowet *widget-publish* tjekker widgetten og lægger den i `app/widgets/community/`, og siden viser den for alle.
Der er ingen server: GitHub er "databasen". Brugere skal have en gratis GitHub-konto for at dele.
