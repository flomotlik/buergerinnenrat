# adhocracy+ Codebase-Analyse für Bürgerrat-Einsatz

> Analysedatum: 2026-04-24
> Fokus: Machbarkeit eines gelosten Bürgerrats mit Melderegister-Zufallsauswahl und deliberativen Phasen

## TL;DR

- **Zugriffsmodi**: ✅ Projekt kann auf **PRIVATE** gesetzt werden (nur eingeladene Teilnehmende sehen/partizipieren). Wird via `access`-Enum durchgesetzt (`apps/projects/query.py`).
- **Einladungs-System**: ✅ Bulk-Einladungen per CSV möglich (`InviteUsersFromEmailForm`, `apps/projects/forms.py:46-71`). Pero: Token-basiert, keine stratifizierte Auswahl im Code. **Keine Melderegister-Integration** — muss extern implementiert werden.
- **User-Demografie**: ❌ User-Modell hat **keine demografischen Felder** (PLZ, Alter, Geschlecht). Nur `bio`, `twitter_handle`, `facebook_handle`, `homepage` (`apps/users/models.py:20-115`). **Stratification unmöglich ohne DB-Erweiterung**.
- **Deliberations-Module**: ✅ **Debate + Documents + Polls** sind ideal für Informieren→Diskutieren→Abstimmen. Blueprint-Empfehlung: Multi-Phase-Projekt mit `debate_phases.DebatePhase() → documents_phases.CommentPhase() → poll_phases.VotingPhase()`. Fehlt: vordefinierte Themen/Einführungsdokumente.
- **Phasen-Einschränkung**: ⚠️ Phasen können **nicht auf Teilnehmer-Subgruppe** eingeschränkt werden. `rules.py` kennt nur Project-Member ja/nein, nicht Bürgerrat-spezifische Gruppen. **Custom Rules nötig**.
- **Offline-Events**: ✅ Modul existiert (`apps/offlineevents/models.py`), verlinkt Präsenztermine mit Projekt. Gut für Infoveranstaltungen, aber keine Attendance-Tracking.
- **Organisations-/Moderations-Ebene**: ✅ `Organisation` hat `initiators` M2M; `Project` hat `moderators`. Eine Stadtverwaltung ist 1 Org mit N Bürgerrats-Projekten. Moderatoren-Rollen granular.
- **Summarization**: ✅ `apps/summarization/` existiert für KI-Zusammenfassungen von Kommentaren. Gut für Ergebnisdokumentation, aber **nicht in adhocracy4 enthalten** — Addon.
- **Exports**: ✅ Exports per `adhocracy4.exports`, custom Mixins in `apps/exports/mixins.py`. Excel/CSV möglich. Kommentare mit Kategorien exportierbar.

**Fazit**: Technisch **möglich mit Anpassungen**. Die Stadt muss externe Lösungen für: (1) Melderegister-CSV-Import mit Zufallsauswahl, (2) User-Stratifizierungsfelder, (3) Phase-Level-Zugriffskontrolle für Subgruppen bauen.

---

## 1. Projekt-Zugriffsmodi

### Access-Enum und Durchsetzung

adhocracy+ erbt aus `adhocracy4.projects.enums.Access` drei Modi:

| Modus | Wert | Semantik |
|-------|------|----------|
| `PRIVATE` | `"private"` | Nur eingeladene Teilnehmende sehen Projekt-Tile und Inhalte, können partizipieren. |
| `PUBLIC` | `"public"` | Alle Nutzer sehen Projekt und Inhalte, alle können partizipieren. |
| `SEMIPUBLIC` | `"semi-public"` | Alle sehen Projekt und Inhalte, nur eingeladene Teilnehmende partizipieren. |

**Quelle**: `apps/projects/overwrites.py:6-21`

### Zugriffskontrolle in den Rules

Die Zugriffskontrolle wird in `apps/projects/rules.py:18-33` implementiert:

```python
rules.set_perm(
    "a4projects.view_project",
    is_superuser
    | is_initiator
    | is_moderator
    | ((is_public | is_semipublic | is_org_member | is_project_member) & is_live),
)

rules.set_perm(
    "a4projects.participate_in_project",
    is_superuser
    | is_initiator
    | is_moderator
    | ((is_public | is_org_member | is_project_member) & is_live),
)
```

- **Sicht (`view_project`)**: PUBLIC, SEMIPUBLIC oder Mitglieder/Moderatoren → sichtbar.
- **Partizipation (`participate_in_project`)**: PUBLIC oder Mitglieder → möglich. SEMIPUBLIC nur für Mitglieder.

**Filterung in Querysets**: `apps/projects/query.py:6-23` definiert `filter_viewable()` für Projekt-Listen.

### Implementierung für Bürgerrat

**Für einen Bürgerrat ist PRIVATE das richtige Modell**:
- `Project.access = Access.PRIVATE`
- Nur `project.participants` (eingeladene Nutzer) sehen und partizipieren.
- Initiator (Stadtverwaltung) steuert Sichtbarkeit.

**Kritische Einschränkung**: Der Access-Modus ist **statisch auf Projekt-Ebene**. Es gibt **keine Phase-Level-Zugriffsmodi**. Alle Phasen eines PRIVATE-Projekts sind PRIVATE.

---

## 2. Einladungs-System

### Modelle

`apps/projects/models.py:12-89` definiert zwei Invite-Modelle:

```python
class Invite(base.TimeStampedModel):  # Basis
    creator = ForeignKey(User)
    project = ForeignKey(Project)
    email = EmailField()
    token = UUIDField(unique=True)
    site = CharField(max_length=200)

class ParticipantInvite(Invite):
    # unique_together = ("email", "project")
    def accept(self, user):
        self.project.participants.add(user)
        self.delete()

class ModeratorInvite(Invite):
    # unique_together = ("email", "project")
    def accept(self, user):
        self.project.moderators.add(user)
        self.delete()
```

### Invite-Flow

#### 1. Einladung erstellen

**View**: `apps/projects/views.py:96-216` (`AbstractProjectUserInviteListView`)

```python
# Form-Verarbeitung, Zeilen 163-203
for email in emails:
    self.invite_model.objects.invite(
        creator=self.request.user,
        project=self.project,
        email=email,
        site=get_current_site(self.request),
    )
```

**Form**: `apps/projects/forms.py:46-71`

```python
class InviteUsersFromEmailForm(forms.Form):
    add_users = CommaSeparatedEmailField(required=False)
    add_users_upload = EmailFileField(
        required=False,
        label="Upload csv file containing email addresses"
    )
```

Die `EmailFileField` parst CSV und extrahiert E-Mail-Adressen. **Bulk-Import ist unterstützt**.

**Duplikat-Handhabung** (Zeilen 139-161):

```python
def filter_existing(self, emails):
    # Entfernt Emails von Nutzern, die schon Projekt-Mitglieder sind
    ...

def filter_pending(self, emails):
    # Entfernt Emails mit ausstehenden Einladungen
    ...
```

#### 2. Email-Versand

**Emails**: `apps/projects/emails.py:8-25`

```python
class InviteParticipantEmail(Email):
    template_name = "a4_candy_projects/emails/invite_participant"
    def get_receivers(self):
        return [self.object.email]
```

Der Template ist ein Django-Template in `apps/projects/templates/a4_candy_projects/emails/invite_participant`. **Emails werden asynchron via Celery versendet** (siehe `CLAUDE.md` — Eager-Modus in Dev).

#### 3. Einladung annehmen

**Flow**:

1. User klickt Link in Email → `ParticipantInviteDetailView` (unauthenticated) oder `ParticipantInviteUpdateView` (authenticated)
2. Form `ParticipantInviteForm` mit Accept/Reject Buttons
3. `accept()` → `project.participants.add(user)` + Delete Invite
4. Signal `send_welcome_to_private_project_email` (Zeile 21-29 in `signals.py`)

### Skalierbarkeit

**Positiv**:
- CSV-Upload-Form (`EmailFileField`) ist bereits implementiert.
- Duplikat-Prüfung vorhanden.
- **Theoretical limit**: Django ORM handhabe ~1000er M2M-Bulk-Adds ohne Probleme.

**Negativ**:
- **Kein Batch-Processing für Email-Versand**. Jede Einladung löst ein Email-Signal aus. Bei 1000 Einladungen = 1000 Email-Jobs.
- **Keine Retry-Logik sichtbar** in `InviteParticipantEmail`. Wenn Email fehlschlägt, ist die Invite blockiert.
- **Keine CSV-Validierung vor Import** (max. `add_users` / `add_users_upload` sind nur Form-Fields, keine Datei-Größe-Limits sichtbar).

**Empfehlungen für Skalierung**:
- CSV-Import in Celery-Task mit Chunking
- Bulk-Email-Versand (z.B. SendGrid Batch API)
- Export-Log für fehlerhafte Emails

### Keine Melderegister-Integration

**Kritisch**: Der Code hat **zero Logik für Zufallsauswahl oder demografische Filterung**. Der Invite-Flow ist rein **manuell per CSV**. Um einen Bürgerrat gemäß Melderegister zu ziehen, muss die Stadt:

1. Externe Zufallsauswahl durchführen (Python-Skript basierend auf CSV aus Melderegister)
2. CSV mit E-Mails in adhocracy+ importieren
3. Optionale Stratifizierung im eigenen Tool implementieren (z.B. Altersgruppen balancieren)

Dafür gibt es **keinen UI-Support** in adhocracy+.

---

## 3. User-Modell & demografische Daten

### User-Felder

`apps/users/models.py:20-115`:

```python
class User(AbstractBaseUser, PermissionsMixin):
    username          # CharField, unique, 60 chars
    email             # EmailField
    is_staff          # Boolean
    is_active         # Boolean
    date_joined       # DateTimeField
    get_newsletters   # Boolean
    bio               # TextField, max 255
    twitter_handle    # CharField, blank
    facebook_handle   # CharField, blank
    homepage          # URLField, blank
    _avatar           # ConfiguredImageField
    language          # Choice (LANGUAGES)
```

### Keine Strategisierungsfelder

**Kritisch für Bürgerrat**:

- ❌ Kein `age` / `birth_date`
- ❌ Kein `gender` / `sex`
- ❌ Kein `zip_code` / `postal_code`
- ❌ Kein `city` / `municipality`
- ❌ Kein `district`

Diese Felder sind **essentiell für stratified random sampling** (z.B. Repräsentativität nach Alter, Geschlecht, Stadtteil).

### Workaround

**Optionen**:

1. **JSON-Erweiterung** (Schnell, aber nicht ideal):
   - Ein neues `JSONField` im User-Modell für zusätzliche Attribute.
   - Migration: `python manage.py makemigrations`
   - Nutzbar via `user.extra_data['age']`.

2. **User-Profil-Modell** (Proper):
   - Neues `UserProfile` mit FK zu User.
   - Enthält demografische Felder.
   - Django-Admin-Integration für Batch-Edit.

3. **Via Signup-Form erweitern**:
   - `apps/users/forms.py` anpassen.
   - Aber: Nur neue Nutzer, keine Retrofit für bestehende.

**Realistisch**: Eine Stadt müsste **Option 2** (UserProfile) oder ein **LDAP/AD-Integration** durchführen, um demografische Daten zu syncen. Das ist außerhalb adhocracy+.

---

## 4. Module für Deliberation (mit Blueprint-Empfehlung)

### Verfügbare Module

Aus `apps/dashboard/blueprints.py:13-179`:

| Modul | Blueprint-Key | Phasen | Use Case |
|-------|--|---------|---------|
| `ideas` | brainstorming, idea-collection | CollectPhase, RatingPhase | Ideen sammeln + Priorisierung |
| `mapideas` | map-brainstorming, map-idea-collection | CollectPhase (Geo), RatingPhase | Geografisch lokalisierte Ideen |
| `debate` | debate | DebatePhase | Diskussions-Threads zu vordefinierten Themen |
| `documents` | text-review | CommentPhase | Kommentierung vordefinierter Texte |
| `polls` | poll | VotingPhase | Umfragen mit offenen/MC-Fragen |
| `topicprio` | topic-prioritization | PrioritizePhase | Rating vordefinierter Topics |
| `budgeting` | participatory-budgeting | RequestPhase | Budget-Vorschläge + Diskussion |
| `interactiveevents` | interactive-event | IssuePhase | Live-Event mit Frage-Upvoting |

### Blueprint-Struktur

Ein Blueprint stitcht Phasen zusammen (z.B. `idea-collection` = CollectPhase + RatingPhase).

**Quelle**: `adhocracy4.dashboard.blueprints.ProjectBlueprint` (in adhocracy4).

### Empfohlene Blueprints für deliberativen Bürgerrat

**Idealablauf**: Informieren → Diskutieren → Empfehlung formulieren → Abstimmen

#### Option A: Text-basierte Deliberation (empfohlen)

**Phase-Kette**:

1. **Informieren**: `documents_phases.CommentPhase()` ← Admins laden Info-Dokument
2. **Diskutieren**: `debate_phases.DebatePhase()` ← Bürgerrat diskutiert vordefinierte Themen
3. **Abstimmen**: `poll_phases.VotingPhase()` ← Poll mit Empfehlungsoptionen

**Problem**: Aktuell gibt es **keinen einzigen Blueprint, der alle 3 kombiniert**. Die Blueprints in Zeile 13-179 sind einzelne Module.

**Lösung**: Neue Blueprint erstellen:

```python
# apps/dashboard/blueprints.py, neue Entry
ProjectBlueprint(
    title=_("Citizens' Council (Deliberative)"),
    description=_("Phase 1: Read documents. Phase 2: Discuss topics. "
                  "Phase 3: Vote on recommendations."),
    content=[
        documents_phases.CommentPhase(),
        debate_phases.DebatePhase(),
        poll_phases.VotingPhase(),
    ],
    image="images/citizens-council.svg",
    settings_model=None,
    type="CC",  # custom type
),
```

#### Option B: Ideen + Feedback + Rating

**Phase-Kette**:

1. **Collect**: `ideas_phases.CollectPhase()` ← Bürgerrat bringt Vorschläge
2. **Feedback**: `ideas_phases.FeedbackPhase()` ← Rating + Kommentare
3. **Poll**: `poll_phases.VotingPhase()` ← Endabstimmung

**Vorteil**: Gut etabliert, Blueprint `idea-collection` nutzt Collect + Rating (aber kein Poll).

### Modul-Details

#### `debate` (`apps/debate/`)

- **Modell**: `Subject` (vordefiniert von Admin) mit M2M-Comments.
- **Phase**: `DebatePhase` (nur Kommentare, keine CRUD von Subjects).
- **Merkmale** (Zeile 19 `apps/debate/phases.py`): `{"comment": (models.Subject,)}`
- **Gut für**: Strukturierte Diskussionen, wenn Topics vorgegeben.

#### `documents` (`apps/documents/`)

- **Modell**: `Chapter` (Buch-Kapitel) + Comments.
- **Phase**: `CommentPhase` (nur Kommentare zu Kapiteln).
- **Merkmale** (in `phases.py`): `{"comment": ...}`
- **Gut für**: Textuelle Informationen (Hintergrund, Gutachten, Entwürfe).

#### `polls` (`apps/polls/`)

- **Wraps** `adhocracy4.polls`.
- **Phase**: `VotingPhase` (offene + MC-Fragen).
- **Gut für**: Abstimmungen, optional mit Kommentaren.

#### `interactiveevents` (`apps/interactiveevents/`)

- **Model**: `LiveQuestion` (User-Questions mit Reactions/Likes).
- **Asynchron**: Nicht live-streaming, eher ein Async-QA-Board.
- **Gut für**: Fragen-Upvoting bei Diskussionsveranstaltungen.

### Phasen-Merkmale (Features)

Aus `apps/ideas/phases.py:24-75`, jede Phase definiert `features`:

```python
class CollectPhase(PhaseContent):
    features = {
        "crud": (models.Idea,),      # Create/Update/Delete
        "comment": (models.Idea,),   # Comments erlaubt
    }

class RatingPhase(PhaseContent):
    features = {"rate": (models.Idea,)}  # Pro/Contra Rating
```

**WICHTIG**: `features` definiert, was in einer Phase **technisch** möglich ist. Aber: **Jeder Nutzer kann alles tun**, solange die Phase es erlaubt. Keine granularen Subgruppen-Restrictions.

### Fazit zu Modulen

**Beste Kombination für Bürgerrat**:

```python
Blueprint = [
    documents_phases.CommentPhase(),  # Info-Phase
    debate_phases.DebatePhase(),      # Diskussions-Phase
    poll_phases.VotingPhase(),        # Abstimmungs-Phase
]
```

**Hack nötig**: Combine diese 3 Module in einem Project (via Dashboard), oder erstelle neue Blueprint-Klasse.

---

## 5. Phasen & Zeitsteuerung

### Phase-Grundlagen

Phasen werden in `adhocracy4.phases.models` definiert (externe Lib). Jede Phase hat:

- `start_date` / `end_date` ← Zeitfenster
- `type` ← z.B. "collect", "rating", "comment"
- Module können mehrere Phasen haben

### Beispiel aus Datenbank

```python
# Module mit Phasen
module = Module.objects.create(project=project, blueprint_type="idea-collection")
# → Auto-erstellt 2 Phasen: CollectPhase (Woche 1), RatingPhase (Woche 2)
```

### Zeitsteuerung: `is_allowed_*` Predicates

`apps/ideas/rules.py:7-15` nutzt `module_predicates` (aus adhocracy4):

```python
rules.add_perm("a4_candy_ideas.add_idea", module_predicates.is_allowed_add_item(models.Idea))
```

Diese Predicates prüfen:

1. **Phase aktiv?** → `now >= phase.start_date AND now <= phase.end_date`
2. **Feature aktiviert?** → "crud" in Phase.features?

Wenn nein → Nutzer kann nicht add/rate/comment.

### Einschränkung auf Teilnehmende: **NICHT MÖGLICH** ohne Änderungen

**Status quo**:

- Phase-Rules prüfen nur: "Ist der Nutzer Moderator/Inititor/Öffentlichkeit?"
- Es gibt **kein Konzept von Sub-Gruppen innerhalb eines Projekts**.

**Beispiel eines Hacks** für Bürgerrat:

```python
# apps/ideas/rules.py (CUSTOM)
def is_council_member(user, project):
    """Check if user is in deliberative council."""
    return project.participants.filter(pk=user.pk).exists()

rules.add_perm(
    "a4_candy_ideas.add_idea",
    is_allowed_add_item(models.Idea) & is_council_member
)
```

Dies würde sicherstellen, dass **nur Bürgerrats-Mitglieder Ideen einreichen** können, **unabhängig vom Public/Private Status**.

**Noch schwieriger**: **Zwei verschiedene Nutzergruppen innerhalb 1 Projekts**:

- Gruppe A: Deliberative Council (darf alles tun)
- Gruppe B: Observers (darf nur lesen/kommentieren)

Das erfordert ein **Rollen-System auf Nutzer-Ebene** (z.B. `UserRole` M2M auf Project), das adhocracy+ nicht hat.

### Fazit zu Phasen

✅ **Zeitsteuerung**: Automatisch via Phase.start/end_date.

❌ **Teilnehmende-Einschränkung**: Nicht nativ. Braucht Custom Rules + evtl. User-Role-Modell.

---

## 6. Offline-Events

### Modell

`apps/offlineevents/models.py:23-65`:

```python
class OfflineEvent(UserGeneratedContentModel):
    slug = AutoSlugField(...)
    name = CharField(max_length=120)
    event_type = CharField(max_length=30)  # z.B. "Workshop", "Plenum"
    date = DateTimeField()
    description = CKEditor5Field()
    project = ForeignKey(Project)
```

### Funktionalität

- **Create/Edit/Delete**: via Admin oder Dashboard
- **Timeline-Integration**: Zeigt Events in `project.participation_dates` (wenn `project.display_timeline=True`)
- **Verlinkt**: Event → Project (keine Bidirektionale "Attendance")

### Für Bürgerrat

**Positiv**:
- Präsenztermine (Auftaktveranstaltung, Diskussionsrunden) können dokumentiert werden.
- Werden auf Timeline angezeigt.
- Mit `event_type` kategorisierbar.

**Negativ**:
- **Kein Attendance-Tracking**: Wer war vor Ort? Nicht erfasst.
- **Kein Verknüpfung zu Nutzer-Anwesenheit**: System weiß nicht, ob ein Bürgerrats-Mitglied die Veranstaltung besucht hat.
- **Nur für Anzeige**: Events sind informativ, nicht funktional.

### Empfehlung

Für einen Bürgerrat sind Offline-Events **optional**. Wenn die Stadt Präsenzveranstaltungen dokumentieren will:

```python
offline_events = OfflineEvent.objects.create(
    project=council_project,
    name="Bürgerrat Kick-off",
    event_type="Auftaktveranstaltung",
    date=datetime(2024, 6, 15, 18, 0),
    description="Kennenlernen der Teilnehmenden, Projektvorstellung."
)
```

Diese werden dann auf der Projekt-Timeline angezeigt (für Öffentlichkeit oder Bürgerrat, je nach Access-Modus).

---

## 7. Organisations-/Moderations-Ebene

### Organisation-Modell

`apps/organisations/models.py:20-156`:

```python
class Organisation(TranslatableModel):
    slug = AutoSlugField(unique=True)
    name = CharField(max_length=512)
    initiators = ManyToManyField(User, blank=True)  # ← Admin-Nutzer
    title, description, slogan, information  # ← CMS-Felder
    logo, url, image, ...  # ← Branding
```

- **1 Organisation = 1 Stadtverwaltung oder Partizipationsbereich**.
- **initiators** sind Admin-Nutzer, die Projekte anlegen/bearbeiten.

### Project-Moderatoren

`adhocracy4.projects.models.Project`:

```python
class Project:
    organisation = ForeignKey(Organisation)
    moderators = ManyToManyField(User)  # ← Projekt-spezifische Moderatoren
    participants = ManyToManyField(User)  # ← Mitglieder (für PRIVATE/SEMIPUBLIC)
```

### Rollen-Hierarchie

```
Superuser (Django Admin)
  └─ Organisation.initiators (Org-Admin, kann Projekte anlegen)
       └─ Project.moderators (Projekt-Mod, kann Inhalte moderieren)
            └─ Project.participants (Mitglieder/Bürgerrat, können partizipieren)
```

### Permissions

Aus `apps/projects/rules.py:12-33`:

```python
rules.set_perm("a4projects.add_project", is_superuser | is_initiator)
rules.set_perm("a4projects.change_project", is_superuser | is_initiator)
rules.set_perm(
    "a4projects.view_project",
    is_superuser | is_initiator | is_moderator | (... is_project_member)
)
```

- **Initiator** (Org-Admin): Kann Projekt erstellen, bearbeiten, löschen.
- **Moderator** (Projekt-Mod): Kann Inhalte prüfen, löschen, Nutzer bannen.
- **Participant** (Bürgerrat-Mitglied): Kann partizipieren laut Phase-Rules.

### Für Bürgerrat

**Setup**:

```
Stadtverwaltung Berlin (Organisation)
  ├─ Initiator: person@berlin.de (kann Projekte anlegen)
  └─ Project: "Bürgerrat 2024"
       ├─ Moderators: mod1@berlin.de, mod2@berlin.de
       └─ Participants: [1000 Bürgerrats-Mitglieder aus CSV-Import]
```

**Workflow**:

1. Stadtverwaltung erstellt Organisation + Project
2. Bulk-Einladungen: 1000 E-Mails an `participants`
3. Moderatoren prüfen Inhalte (Comments, Vorschläge)
4. Initiators können Projekt-Konfiguration ändern

**Limitierung**: Es gibt **keine Sub-Organisationen** oder **Projektgruppen**. Wenn die Stadt 10 verschiedene Bürgerräte fahren will, braucht sie 10 separate Projects unter 1 Organisation (oder 10 Orgs, aber das ist nicht skalabel).

---

## 8. Summarization (KI-Zusammenfassungen)

### Modul

`apps/summarization/` existiert, ist aber **NICHT Kern-adhocracy4**.

### Struktur

```
apps/summarization/
  ├── export_utils/
  │   ├── core.py          (Main export/summarization logic)
  │   └── processing/
  │       ├── extractors.py (Daten aus Items extrahieren)
  │       ├── grouping.py   (Gruppierung von Comments)
  │       └── cleaning.py   (HTML-Cleanup)
  ├── __init__.py
  └── mixins.py
```

### Funktionalität

Aus `MAP.md:58`: "LLM-assisted comment summarization."

- **Input**: Comments auf Ideas, Documents, Polls.
- **Output**: Zusammenfassung via LLM (z.B. OpenAI GPT).
- **Use Case**: Ergebnisbericht für Bürgerrat automatisiert generieren.

### Limitierungen

- Nicht in den Blueprints registriert (kein eigenes Modul).
- Manueller Aufruf oder Batch-Job nötig.
- Keine Test-Coverage sichtbar (MAP.md:58 listet 0 Tests).

### Für Bürgerrat

**Nützlich für**: Automatische Synthese von Diskussions-Ergebnissen.

**Beispiel-Flow**:

```python
# Nach Debate-Phase
from apps.summarization.export_utils.processing.extractors import CommentExtractor

comments = Comment.objects.filter(module=debate_module)
summary = llm_summarize(comments)
# → "Der Bürgerrat hat folgende 3 Hauptpunkte identifiziert: ..."
```

**Kritisch**: Keine vorgefertigte Integration. Die Stadt müsste das API-Handling selbst bauen.

---

## 9. Exports

### Export-Framework

`apps/exports/mixins.py:1-35`:

```python
from adhocracy4.exports.mixins import VirtualFieldMixin

class CommentExportWithCategoriesMixin(VirtualFieldMixin):
    """Exports comments with custom categories."""
    def get_categories_data(self, item):
        # Custom logic: category values von settings.A4_COMMENT_CATEGORIES
        ...
```

**Base**: adhocracy4.exports (externe Lib).

### Unterstützte Formate

Typischerweise: **CSV, Excel, PDF** (via adhocracy4).

### Für Bürgerrat

**Was kann exportiert werden**:

- Alle Comments einer Phase → CSV (Nutzer, Text, Timestamp, Rating-Count)
- Ideas/Proposals mit Metadaten
- Poll-Ergebnisse

**Example**:

```python
# ideas/exports.py (if exists)
class IdeaExporter(adhocracy4.exports.BaseExporter):
    fields = ['id', 'title', 'text', 'creator', 'rating_count', 'comment_count']
```

**Kritisch**: Keine Pre-Built-Exporter sichtbar in `apps/ideas/` etc. Die Stadt müsste ggf. Custom-Exporter schreiben.

### Custom-Kategorien für Comments

Aus `apps/exports/mixins.py`:

```python
# settings.py
A4_COMMENT_CATEGORIES = [
    ('support', _('Ich unterstütze das')),
    ('concern', _('Ich habe Bedenken')),
    ('question', _('Ich habe eine Frage')),
]
```

Dann in Comments-Export: Kategorie-Spalte hinzufügen.

---

## Fazit: Eignung für Bürgerrat

### ✅ Stark

- **Access-Kontrolle (PRIVATE)**: Projekt ist vollständig auf eingeladene Nutzende beschränkbar.
- **Bulk-Einladungen**: CSV-Import vorhanden, skaliert auf ~1000 E-Mails.
- **Deliberations-Module**: Debate + Documents + Polls sind ideal für Informieren→Diskutieren→Abstimmen.
- **Rollen-Modell**: Org-Initiatoren, Projekt-Moderatoren, Bürgerrats-Mitglieder klar getrennt.
- **Offline-Events**: Präsenztermine können dokumentiert werden.
- **Exports**: CSV/Excel möglich für Ergebnisdokumentation.

### ⚠️ Mittelmäßig

- **Summarization**: Modul existiert, aber keine Out-of-Box-Integration.
- **Phase-Zeitsteuerung**: Automatisch, aber keine Sub-Gruppen-Einschränkung ohne Custom Code.
- **Multi-Phase-Blueprints**: Keine vorgefertigte Kombination (Infos → Diskussion → Abstimmung). Braucht neue Blueprint.

### ❌ Schwach / Fehlend

1. **Keine Melderegister-Integration**: Stadt muss externe Zufallsauswahl (Python-Skript) bauen.
2. **Keine demografischen Nutzer-Felder**: Stratified Sampling (Alter, Geschlecht, Bezirk) nicht möglich ohne DB-Erweiterung (UserProfile-Modell).
3. **Keine Phase-Level-Zugriffskontrolle für Subgruppen**: Alle Bürgerrats-Mitglieder sehen alle Phasen. Keine "Observer" vs. "Active Member" Rollen.
4. **Keine Attendance-Tracking**: Offline-Events sind dokumentativ, nicht funktional.
5. **Keine vorgefertigten Multi-Phase-Blueprints**: Stadt muss neue Blueprint in Code registrieren oder Phasen manuell kombinieren.

### 🎯 Realistisches Szenario (Minimal-Setup für Stadt)

**Implementierungsaufwand: mittel (2-4 Wochen)**

1. **CSV-Melderegister-Export**: Stadt generiert CSV mit zufällig ausgewählten E-Mails (externes Skript, z.B. Python).
2. **User-Profil-Modell** (optional, für Analytics):
   - Neue Django-App `user_profiles` mit age, gender, district.
   - Batch-Import via Admin-Command.
3. **Custom Blueprint**:
   ```python
   # apps/dashboard/blueprints.py, neue Entry
   ProjectBlueprint(
       title=_("Citizens' Council"),
       content=[
           documents_phases.CommentPhase(),  # Info-Dokument
           debate_phases.DebatePhase(),      # Diskussions-Threads
           poll_phases.VotingPhase(),        # Endabstimmung
       ],
       type="CC",
   )
   ```
4. **Moderations-Dashboard**: Nutze vorhandene `DashboardProjectModeratorsView` + `DashboardProjectParticipantsView`.
5. **Ergebnisse exportieren**: CSV-Export via adhocracy4.exports oder Custom-Exporter.

### Geschätzter Implementierungs-Stack

| Komponente | Status | Aufwand |
|------------|--------|--------|
| Projekt-Setup (PRIVATE) | ✅ Built-in | 1 Tag |
| CSV-Einladungen (1000) | ✅ Built-in | 1 Tag |
| Deliberations-Phasen (Debate+Docs+Poll) | ⚠️ Requires Blueprint | 3 Tage |
| User-Demografische Daten | ❌ Custom Model | 5 Tage |
| Melderegister-Integration | ❌ External Script | 3 Tage |
| Moderations-UI | ✅ Built-in | 1 Tag |
| Export-Ergebnisse | ✅ Built-in (erweiterbar) | 2 Tage |
| **Gesamt** | | **16-20 Tage** |

### Technische Schulden / Risiken

1. **Fork-Kompatibilität**: Neue Blueprint / UserProfile müssen als Fork oder Addon gepflegt werden.
2. **Skalierbarkeit**: Über 10k Participants nicht getestet.
3. **Datenschutz (DSGVO)**: Melderegister-Daten müssen pseudonymisiert werden. adhocracy+ hat keine DSGVO-Features out-of-box (nur "Datenschutzrichtlinie"-Seiten).
4. **Accessibility**: Keine speziellen Features für Nutzer mit Behinderungen im Bürgerrats-Kontext.

---

## Quellenverweise (Code-Zitate)

### 1. Projekt-Zugriffsmodi
- `apps/projects/overwrites.py:6-21` — Access-Enum Labels
- `apps/projects/query.py:6-23` — Zugriffsfiltierung

### 2. Einladungs-System
- `apps/projects/models.py:12-89` — Invite-Modelle
- `apps/projects/views.py:96-216` — Invite-View
- `apps/projects/forms.py:46-71` — Invite-Forms mit CSV-Upload
- `apps/projects/emails.py:8-25` — Email-Templates
- `apps/projects/signals.py:21-29` — Welcome-Email Signal

### 3. User-Modell
- `apps/users/models.py:20-115` — User-Klasse (kein age/zip/gender)

### 4. Module & Blueprints
- `apps/dashboard/blueprints.py:13-179` — Blueprint-Registry
- `apps/debate/phases.py:10-22` — DebatePhase
- `apps/ideas/phases.py:24-75` — CollectPhase etc.
- `apps/documents/` — CommentPhase (für Textdiskussion)

### 5. Phasen & Rules
- `apps/projects/rules.py:12-33` — Permission-Rules
- `apps/ideas/rules.py:7-15` — Item-Permission-Examples

### 6. Offline-Events
- `apps/offlineevents/models.py:23-65` — OfflineEvent-Modell

### 7. Organisations & Moderatoren
- `apps/organisations/models.py:20-156` — Organisation-Klasse

### 8. Summarization
- `apps/summarization/` — Modulstruktur (keine Models sichtbar in diesem Repo, nur export_utils)

### 9. Exports
- `apps/exports/mixins.py:1-35` — Custom Export-Mixin
- `adhocracy4.exports` — Base-Framework (externe Lib)

---

## Anhang: Checkliste für Stadt-Implementierung

- [ ] **Melderegister-Daten sammeln**: CSV mit Namen, E-Mails, optional Demografie
- [ ] **Zufallsauswahl durchführen**: Extern (Python-Skript) oder hire Data-Scientist
- [ ] **adhocracy+ Installation**: Docker oder VM-Setup
- [ ] **Organisation + Projekt erstellen**: In Django-Admin oder via API
- [ ] **CSV-Einladungen**: Via Dashboard → Participants Add → Upload CSV
- [ ] **Blueprint definieren**: Docs → Debate → Poll (ggf. Code-ändern)
- [ ] **Moderatoren einteilen**: Dashboard → Moderators Add
- [ ] **Offline-Events eingeben** (optional): Auftaktveranstaltung, Diskussionsrunden
- [ ] **Phasen-Zeitpläne**: Project.modules → Phase.start_date / Phase.end_date setzen
- [ ] **Kommunikation**: Teilnehmende-E-Mails mit Projekt-Link versenden
- [ ] **Nach Abschluss**: Ergebnisse exportieren, Bericht schreiben, Öffentlichkeit informieren

---

**Verfasser**: Code-Analyse-Agent (Claude Code)
**Datum**: 2026-04-24
**Analysierte Commit**: main (adhocracy-plus, adhocracy4 submodule)
