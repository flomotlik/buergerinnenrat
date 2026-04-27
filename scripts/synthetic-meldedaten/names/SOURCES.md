# Quellen der Namens-Listen

Die Namens-Listen in diesem Verzeichnis sind kuratierte Auszüge aus öffentlich
zugänglichen Datenbeständen. Sie dienen ausschließlich der **synthetischen
Daten-Generierung** für Demonstrations-Zwecke. Sie sind **keine real-typischen
Verteilungen** für Herzogenburg oder eine andere konkrete Gemeinde, sondern
repräsentative Mischungen für ein realistisch wirkendes Test-Set.

Abrufdatum aller Quellen: **2026-04-26**.

## Cluster `at-de` — deutsch-österreichisch

- **Vornamen** (`at-de-vornamen-weiblich.txt`, `at-de-vornamen-maennlich.txt`):
  Mischung aus Statistik-Austria-Top-Vornamen der letzten Jahre und klassischen
  österreichischen Namen mehrerer Generationen.
  - <https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/geburten/vornamen-der-geborenen>
- **Nachnamen** (`at-de-nachnamen.txt`):
  Häufige Familiennamen in Österreich (Wikipedia-Liste).
  - <https://de.wikipedia.org/wiki/Liste_der_h%C3%A4ufigsten_Familiennamen_in_%C3%96sterreich>

## Cluster `tr` — türkisch

- **Vornamen + Nachnamen** (`tr-vornamen-weiblich.txt`, `tr-vornamen-maennlich.txt`,
  `tr-nachnamen.txt`):
  Häufige türkische Vor- und Nachnamen (Wikipedia / Wiktionary).
  - <https://en.wikipedia.org/wiki/Turkish_name>
  - <https://en.wikipedia.org/wiki/List_of_most_common_surnames_in_Asia#Turkey>
- Diakritika (`ç`, `ş`, `ğ`, `ı`, `ö`, `ü`) sind exakt erhalten.

## Cluster `ex-yu` — ex-jugoslawisch (Serbien, Bosnien, Kroatien, Mazedonien)

- **Vornamen + Nachnamen** (`ex-yu-vornamen-weiblich.txt`, `ex-yu-vornamen-maennlich.txt`,
  `ex-yu-nachnamen.txt`):
  Häufige Vor- und Nachnamen aus dem serbo-kroatischen Sprachraum (Wikipedia).
  - <https://en.wikipedia.org/wiki/Serbian_name>
  - <https://en.wikipedia.org/wiki/Croatian_name>
  - <https://en.wikipedia.org/wiki/Bosniak_name>
- Enthält bewusst auch bosnisch-muslimische Namens-Endungen (`-ović` mit
  `Hodžić`, `Hadžić`, `Demirović`, `Hasanović`).
- Diakritika (`č`, `ć`, `đ`, `š`, `ž`) sind exakt erhalten.

## Cluster `osteuropa` — Polen, Tschechien, Slowakei, Ungarn, Rumänien

- **Vornamen + Nachnamen** (`osteuropa-vornamen-weiblich.txt`,
  `osteuropa-vornamen-maennlich.txt`, `osteuropa-nachnamen.txt`):
  Mischung aus den fünf häufigsten EU-Herkunftsländern in Niederösterreich
  (Wikipedia-Listen je Sprachraum).
  - <https://en.wikipedia.org/wiki/Polish_name>
  - <https://en.wikipedia.org/wiki/Czech_name>
  - <https://en.wikipedia.org/wiki/Slovak_name>
  - <https://en.wikipedia.org/wiki/Hungarian_names>
  - <https://en.wikipedia.org/wiki/Romanian_name>
- Diakritika (`ł`, `ń`, `ó`, `ś`, `ż`, `č`, `š`, `é`, `í`, `ó`, `ú`, `ű`, `ő`,
  `ă`, `î`, `ș`, `ț`) sind exakt erhalten.

## Lizenz-Begründung

Die Quellen stehen unter folgenden Lizenzen:

- **Statistik Austria** (Vornamen): Open-Government-Data Österreich, **CC-BY 4.0**.
- **Wikipedia** (Familiennamen pro Sprachraum): **CC-BY-SA 4.0**.

Die Auszüge in diesem Verzeichnis umfassen je 30 bis 50 Einträge pro Liste.
Nach österreichischem Urheberrecht gelten Listen dieser Größe als
**unwesentliche Auszüge** aus Datenbanken im Sinne des **UrhG §87a Abs. 1**
(siehe auch deutsche Parallel-Regelung in **§87b UrhG-DE**) und sind als
Faktendaten ohnehin nicht selbst urheberrechtlich geschützt.

Als Attribution gemäß CC-BY und CC-BY-SA dienen die hier dokumentierten
Quell-URLs samt Abrufdatum.

## Wichtiger Hinweis

Die Listen sind **nach Häufigkeit grob sortiert**, aber der Generator zieht
**uniform**. Das ist eine bewusste Vereinfachung: für synthetische Test-Daten
ist Vielfalt wichtiger als statistische Realismus-Treue im Detail.

Die **Gewichtung der Cluster gegeneinander** (z.B. 85 % `at-de` / 5 % `tr`)
findet im Generator-Profil statt (`scripts/synthetic-meldedaten/profiles/*.json`),
nicht in diesen Listen.
