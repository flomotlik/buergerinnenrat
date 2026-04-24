# Gap-Analyse und Umsetzungsskizze: Bürgerrat-Workflow in adhocracy-plus

**Datum:** 2026-04-24  
**Status:** Forschungsdokument  
**Sprache:** Deutsch

---

## TL;DR

Die City hätte mit **Variante A (Minimal-Hack)** in 1–2 Wochen einen funktionsfähigen Bürgerrat-Workflow, müsste aber externe Tools für Stratifikation nutzen und auf vollautomatisierte PDF-Briefgeneration verzichten. **Variante B (saubere Lösung)** kostet 4–6 Wochen, liefert dafür eine wartbar, DSGVO-konform, and integrierten Sortitions-Pipeline mit allen Bells & Whistles. 

**Ehrliche Antwort zu Upstream:** Eine dedizierte Bürgerrat-App ist zu spezialisiert für adhocracy4/adhocracy-plus Kernrepo. **Empfehlung: Fork + eigene App.** Liquid Democracy e.V. sollte am Design-Austausch beteiligt sein, aber der Upstream-Pfad ist zu lang.

---

## 1. Gap-Analyse: Was fehlt heute?

Jedes Lückenfeld wurde gegen `apps/projects/`, `apps/users/`, `apps/offlineevents/`, `apps/dashboard/blueprints.py` und die Invite-Mechanik geprüft.

### 1.1 Melderegister-Import & Stratifikationsdaten

**Status:** ❌ **Fehlt komplett**  
**Kritikalität:** **MUSS**

**Beschreibung:**  
adhocracy-plus hat keinen Mechanismus zum Massenimport von CSV/XML-Registerdaten mit Metadaten (Alter, Geschlecht, Stadtteil, PLZ etc.). Ein Bürgerrat braucht:

1. CSV/XML-Upload mit Spalten: `id, name, email, age, gender, district, ...`
2. Validierung & Deduplizierung
3. **Verschlüsselte** Speicherung (diese Daten sind hochsensibel, § 46 BMG)
4. Metadaten-Tagging für Stratifikation (keine Speicherung im User-Modell!)

**Aktuelles System:**  
- `apps/projects/forms.py` hat `InviteUsersFromEmailForm` mit Upload (nur CSV, nur E-Mails) — `apps/projects/views.py:105ff`
- `apps/users/models.py` hat *keine* demografischen Felder (richtig für Public-Platform, falsch für Bürgerrat!)
- Keine Migrations-Strategie für zeitlich begrenzte Daten

**Gap-Größe:** ~350 LOC (Model + Form + View + Tests)

---

### 1.2 Stratifizierter Sampling-Algorithmus

**Status:** ❌ **Fehlt**  
**Kritikalität:** **MUSS**

**Beschreibung:**  
Der Bürgerrat braucht:

1. **Algorithmus zur stratifizierten Zufallsstichprobe:**  
   - Input: N=300.000 Einwohner mit `[age_group, gender, district]`
   - Output: n=5.000 repräsentative Stichprobe (proportional zu Populationen je Schicht)
   - Tool: `panelot` (Python, Sortition Foundation) oder `stratification`-Library

2. **Integration in Django-Admin oder Management-Command**

**Aktuelles System:**  
- Keine Sortitions-Logik vorhanden
- adhocracy4 `Project.participants` ist eine M2M, kann mit QuerySet-Sampling gelöst werden, aber **nicht stratifiziert**

**Gap-Größe:** ~200 LOC + externe Dependency (`pip install panelot`)

---

### 1.3 Einladungs-Brief-Versand (PDF-Serienbriefe mit Token)

**Status:** ❌ **Kritisch Gap**  
**Kritikalität:** **MUSS**

**Beschreibung:**  
Der Bürgerrat versendet nicht E-Mails, sondern **Papierpost mit Token** (Datenschutz, höhere Rücklaufquote).

Benötigt:

1. **PDF-Serienbrief-Generator:**
   - Template mit `{{citizen_name}}`, `{{token_url}}`, `{{deadline}}`
   - Batch-Generierung von 5.000 PDFs (+ Merge für Versand)
   - Merge mit Briefpostanbieter (Brief.de API, DeutschPost Connect, etc.) — *außer Scope hier*

2. **Tracking:** Tokens müssen in DB registriert sein, bevor Brief versendet wird

**Aktuelles System:**  
- `apps/projects/emails.py` hat Mail-Templates (`invite_participant`, `welcome_participant`) — **nur E-Mail!**
- Keine PDF-Generierung vorhanden
- Keine Batching/Scheduling für Massenversand

**Gap-Größe:** ~300 LOC + Template + (optional) `reportlab` oder `weasyprint` Dependency

---

### 1.4 Token-basierter Zugang & Invite-Flow

**Status:** ✅ **Teilweise vorhanden, aber nicht ideal für Bürgerrat**  
**Kritikalität:** **SOLLTE** (Anpassung statt Neubau)

**Beschreibung:**  
adhocracy-plus hat bereits ein Token-Invite-System:
- `apps/projects/models.py:12–58` — `Invite` (abstract), `ParticipantInvite`, `ModeratorInvite`
- UUID-Token, eindeutig pro `(email, project)` — `models.py:16`
- Akzeptanz-Flow: `ParticipantInviteUpdateView` (`apps/projects/views.py:50ff`)

**Das Problem für Bürgerrat:**
1. Invites sind E-Mail-basiert → Bürgerrat braucht **postale Invites mit PIN/Token auf Brief**
2. Das System prüft `(email, project)` Eindeutigkeit — aber bei gelosten Teilnehmern könnte es **zwei Rollen** geben:
   - **"Gelost"** (erhalten Brief mit Token)
   - **"Bestätigt"** (haben geantwortet, sind in Zweitlosung)
   - Das aktuelle Modell unterscheidet das nicht!

**Anpassungen nötig:**
- `ParticipantInvite` → neues Feld `status` (gelost, bestätigt, abgelehnt, abgelaufen)
- Alternative URL-Struktur: statt `?token=xxx` → postale Benachrichtigung mit Token, Login dann mit Token + PIN
- View-Logic für zwei-stufigen Accept

**Gap-Größe:** ~150 LOC (1 Migration + 1 Feld + angepasster View)

---

### 1.5 Stufenweiser Losprozess (Stichprobe → Rückmelder → finale Auswahl)

**Status:** ❌ **Fehlt komplett**  
**Kritikalität:** **MUSS**

**Beschreibung:**  
Bürgerrat braucht **zwei Sortitions-Phasen**:

1. **Phase 1:** Stadtverwaltung → CSV-Import → Stratifizierte Zufallsstichprobe (5.000 aus 300.000)  
   Versand Einladungsbriefe mit Token

2. **Phase 2:** Rückmelder → Zweite Zufallsstichprobe aus Annehmenden (50 aus ggf. 2.000)  
   Nach Deadline: stratifizierte Auswahl basierend auf (Alter, Geschlecht, Stadtteil) der Annehmenden

Das System muss **zwei unabhängige Lose** managen, mit je eigenem Auswahlpool und Audit-Trail.

**Aktuelles System:**
- `Project.participants` ist flat (M2M)
- Keine Rollen-Unterscheidung für "Phase 1 Gelost" vs. "Phase 2 Bestätigt"
- `ParticipantInvite` hat *keinen* Status für Losprozess

**Gap-Größe:** ~500 LOC (2 Models + Admin-Views + Management-Commands + Tests)

---

### 1.6 Nicht-öffentliche Projekte (Deliberation nur für Eingeladene)

**Status:** ⚠️ **Teilweise vorhanden, aber schwach**  
**Kritikalität:** **SOLLTE**

**Beschreibung:**  
Der Bürgerrat soll **privat** sein: nur eingeladene Teilnehmende (+ Moderatoren + Stadtverwaltung) sehen Inhalte und können diskutieren. Keine anonymen Zuschauer, keine öffentliche Browsing.

**Aktuelles System:**
- adhocracy4 `Project` hat `is_draft` (boolean) — keine granulare Zugriffskontrolle
- `apps/projects/query.py` hat Queries für "public projects" vs. "organisatoin members"
- Permissions in `apps/*/rules.py` sind phasenbezogen (z.B. "can_comment_in_collect_phase")

**Das Problem:**
- Ein privates Projekt ist **nicht dasselbe** wie `is_draft`
- adhocracy4 unterscheidet nicht "öffentlich" vs. "nur für participants"
- Alle Phasen-Permissions prüfen globale Zugriff, nicht pro-Project-Access

**Anpassungen nötig:**
- entweder: `Project` → neues Feld `access` (public, private, draft)
- oder: Neue Model `CitizenCouncilProject` als spezialisierte Subclass

**Gap-Größe:** ~100 LOC (1 Feld + Permission-Logic + Tests) **ODER** neue Wrapper-App

---

### 1.7 Demografische User-Felder (Alter, Geschlecht, Stadtteil)

**Status:** ❌ **Fehlt, und sollte auch fehlend bleiben (DSGVO!)**  
**Kritikalität:** **NICE-TO-HAVE** (aber mit Caveats)

**Beschreibung:**  
Ein naiver Approach: `apps/users/models.py` erweitern um `age`, `gender`, `district`.

**Das Problem: DSGVO § 6 (Erlaubnis) + § 35 (Impact Assessment)!**
- Demografische Daten sind in Deutschland *personenbezogen*
- Sie werden nur für Stratifikation gebraucht, **NICHT** für Nutzung in der Plattform
- Nach Abschluss des Bürgerrats müssen sie **gelöscht** werden!

**Besserer Approach:**
1. Demografische Daten werden **nicht** in `User` gespeichert
2. Stattdessen in separatem, **verschlüsseltem** Model (`MelderegisterSample`)
3. ID-Mappings: Hash(SSN) → User, damit Post-Versand trackbar ist
4. Nach Deadline: Alle `MelderegisterSample`-Einträge **kryptographisch löschen**

**Gap-Größe:** ~200 LOC (neues Model + Encryption-Wrapper + Retention-Policy)

---

### 1.8 Deliberative Module (Informieren → Diskutieren → Empfehlung → Abstimmen)

**Status:** ✅ **Sehr gut vorhanden!**  
**Kritikalität:** **N/A (kein Gap)**

**Beschreibung:**  
adhocracy-plus hat alle Module, die ein Bürgerrat braucht:

- **Informieren:** `documents` (Text Review) — Verwaltung stellt Info-Material
- **Diskutieren:** `debate` oder `ideas` (Brainstorming + Comments)
- **Empfehlung/Priorisierung:** `topicprio` (Pro/Contra + Ranking)
- **Abstimmen:** `polls` (Multiple Choice + Text-Answers)

Diese sind bereits Multi-Phase, mit Permission-Logic pro Phase.

**Blueprint-Struktur** in `apps/dashboard/blueprints.py:13ff` zeigt genau diese Pattern: Sequentielle Phasen, jede mit eigenem Ruleset.

**Kein Handlungsbedarf.** Ein Bürgerrat könnte **einfach ein Custom Blueprint** sein (kombiniert aus bestehenden Phasen). Beispiel:

```python
"citizen-council-deliberation" = ProjectBlueprint(
    title=_("Citizen Council"),
    content=[
        documents_phases.CommentPhase(),    # Diskussion
        topicprio_phases.RatingPhase(),     # Gewichtung
        poll_phases.VotingPhase(),          # Abstimmung
    ],
    ...
)
```

---

### 1.9 Offline-Hybrid (Präsenztermine + Live-Voting + Moderation)

**Status:** ⚠️ **Teilweise vorhanden, aber lose integriert**  
**Kritikalität:** **SOLLTE**

**Beschreibung:**  
Ein Bürgerrat hat **Offline-Komponenten**:
- Präsenz-Termine (Moderation, Diskussion vor Ort)
- Live-Abstimmung während Event
- Moderation durch Fachpersonen

**Aktuelles System:**
- `apps/offlineevents/` (~600 LOC) — Events sind separates Model, *nicht* fest mit Phasen verknüpft
- `OfflineEvent` (`models.py:23`) hat `project` FK, `date`, `description`, `event_type`
- Views zeigen Events im Project-Timeline, aber **keine Verknüpfung zu Phasen oder Voting!**
- `apps/interactiveevents/` hat Live-Q&A, aber nicht für Abstimmung

**Gap:**
- Event-Phasen-Verknüpfung (z.B. "diese Phase läuft *während* dieses Events")
- Live-Voting oder Moderation-Signale während Event
- Audit-Trail für Offline-Abstimmungen

**Gap-Größe:** ~200 LOC (M2M-Relation + API-Endpoints + Tests)

---

### 1.10 Zusammenfassung & Ergebnisdokumentation

**Status:** ⚠️ **Teilweise vorhanden, exportierbar, aber nicht "Report"-optimiert**  
**Kritikalität:** **SOLLTE**

**Beschreibung:**  
Nach einem Bürgerrat sollen **Ergebnisse öffentlich dokumentiert** werden:
- Zusammenfassung der Diskussionen
- Voting-Ergebnisse
- Empfehlungen mit Begründungen

**Aktuelles System:**
- `apps/summarization/` hat LLM-basierte Zusammenfassungen (230 LOC)
- `apps/exports/` hat Cross-Module Export-Wiring
- `generate_full_export()` in `summarization/export_utils/core.py` kann **alles** exportieren

**Das Problem:**
- Exports sind **technisch** (JSON/CSV), nicht **lesbar** für Bürger
- Kein "Public Report"-Template (HTML/PDF)
- Keine Filterung (Private Diskussionen bleiben privat, nur Ergebnisse öffentlich)

**Gap-Größe:** ~150 LOC (Report-Generator + HTML-Template + Permission-Filter)

---

### 1.11 DSGVO-Löschung (Retention Policy)

**Status:** ❌ **Nicht systematisch vorhanden**  
**Kritikalität:** **MUSS**

**Beschreibung:**  
Nach Projektende müssen **alle Melderegister-Daten gelöscht** werden:
- Personenbezogene Daten (Name, Adresse aus CSV)
- Hash-Mappings (SSN → User)
- Audit-Logs für Stratifikation

German data protection (GDPR Art. 17 + § 3 BDSG) verlangt:
- Frist klar definieren (z.B. "6 Monate nach Projektende")
- Automatische Löschung (nicht manuell)
- Kryptographisch sicher (nicht nur `DELETE`)
- Audit-Trail für Löschungen

**Aktuelles System:**
- `apps/users/models.py` hat *keine* Retention-Policy
- Keine Management-Commands für automatische Löschung
- Keine Signal-Handler für Cleanup

**Gap-Größe:** ~200 LOC (Model-Lifecycle + Management-Command + Celery Task)

---

## 2. Umsetzungsskizze: Zwei Varianten

### 2.1 Variante A: Minimal-Hack auf Bestandsfeatures (1–2 Wochen)

**Philosophie:** Maximal mit bestehenden Features arbeiten, minimale Code-Änderungen.

**Workflow:**
1. **Stratifikation extern:** Stadt nutzt Excel oder Sortition Foundation CLI lokal
   - Output: `sampled_5000.csv` (id, name, email, age, gender, district)

2. **Massenversand extern:** Stadt nutzt `apps/projects/forms.py:InviteUsersFromEmailForm`
   - CSV-Upload → E-Mail-Invites (Token per E-Mail)
   - *Nicht ideal, aber funktioniert*

3. **Private Project:** Stadt erstellt Project mit `is_draft=true` (Semi-Private)
   - Moderatoren + Teilnehmende können Invite akzeptieren
   - Public Browser sieht Projekt nicht (aber nur wegen `is_draft`, nicht wegen Zugriffskontrolle)

4. **Offline-Events:** Nutze `apps/offlineevents/` wie geplant (keine Änderung nötig)

5. **Export & Report:** Nutze `apps/summarization/generate_full_export()`, gib das JSON in jedes Word-Template

6. **DSGVO:** Manueller Cleanup (nur Excel-Listen löschen, User bleiben)

**Aufwand:**
- **Code:** 0 Commits (nur Config)
- **Setup:** ~1 Woche Schulung + Dokumentation
- **Pro:**
  - Sofort produktiv
  - Keine Migrations-Probleme mit Forks
  - Externe Tools sind best-of-breed (Sortition Foundation kennt ihr Geschäft)
- **Contra:**
  - Manuelle Schritte = fehleranfällig (falsche Schichten, Duplikate)
  - E-Mail statt Papier (höhere Unsubscribe-Rate)
  - Keine Audit-Trails in adhocracy-plus
  - DSGVO-Compliance ist "per Handbook", nicht automiert
  - Keine Zweit-Stratifikation aus Rückmeldungen

**Realistische Einschätzung:** Für eine Stadt mit <100.000 Einwohnern OK, für größere Prozesse zu fragil.

---

### 2.2 Variante B: Saubere Lösung — Neue App `apps/buergerrat/` (4–6 Wochen)

**Philosophie:** Dedizierte Django-App, vollständig integriert, production-ready, DSGVO-konform.

#### 2.2.1 App-Struktur

```
apps/buergerrat/
├── models.py              # CitizenCouncil, MelderegisterSample, SortitionRound, etc.
├── admin.py               # Django Admin UI für Stadtverwaltung
├── views.py               # Import-Views, Stratifikation, PDF-Versand
├── forms.py               # CSV-Upload, Stratifikations-Config
├── urls.py                # /buergerrat/import/, /buergerrat/sample/, etc.
├── sortition.py           # Algorithmus (stratifizierte Zufallsstichprobe)
├── mail.py                # PDF-Brief-Generator
├── tasks.py               # Celery: Batched PDF-Gen, Auto-Löschung
├── permissions.py         # django-rules für Stadtverwaltungs-Zugriff
├── migrations/
│   └── 0001_initial.py    # Models
├── templates/
│   ├── invitation_letter.html  # PDF-Template für Brief
│   └── admin/              # Admin-Änderungen
├── assets/
│   └── buergerrat.js       # (optional) React-Interface für Admin
└── tests/
    ├── test_models.py
    ├── test_sortition.py
    ├── test_mail.py
    └── ...
```

#### 2.2.2 Django Models

**Core Models (grob):**

```python
# apps/buergerrat/models.py (Pseudocode, nicht ausführbar)

class CitizenCouncil(base.TimeStampedModel):
    """Übergeordnetes Objekt für einen Bürgerrat."""
    organisation = FK(Organisation)
    name = CharField(max_length=200)
    project = OneToOneField(Project)
    
    # Stratifikations-Metadaten
    stratification_fields = JSONField()  # ["age_group", "gender", "district"]
    first_sample_size = IntegerField(default=5000)
    final_sample_size = IntegerField(default=50)
    
    # Phasen
    created_at = DateTimeField(auto_now_add=True)
    first_invitations_sent_at = DateTimeField(null=True)  # Nach Stratifikation
    rsvp_deadline = DateTimeField()
    second_lottery_at = DateTimeField()
    project_end_at = DateTimeField()
    data_retention_days = IntegerField(default=180)  # DSGVO Frist
    
    def __str__(self):
        return f"{self.name} ({self.organisation.name})"


class MelderegisterSample(base.TimeStampedModel):
    """Temporäre, verschlüsselte Speicherung von Melderegister-Daten."""
    council = FK(CitizenCouncil)
    
    # Verschlüsselt (AES-256 mit project-spezifischem Key)
    encrypted_data = BinaryField()
    
    # Für Stratifikation (außerhalb Verschlüsselung, weil öffentlich)
    age_group = CharField(max_length=20)  # "20-30", "30-40", ...
    gender = CharField(max_length=10)     # "M", "F", "D"
    district = CharField(max_length=100)  # "Mitte", "Kreuzberg", ...
    
    # Zuordnung
    user = FK(User, null=True, on_delete=models.SET_NULL)  # Falls registriert
    email = EmailField()
    
    # Losprozess-Status
    round_1_status = CharField(
        max_length=20,
        choices=[("sampled", "In Stichprobe"), ("invited", "Eingeladen"), ...]
    )
    round_2_status = CharField(
        max_length=20,
        choices=[("eligible", "Berechtigt"), ("selected", "Ausgewählt"), ...]
    )
    
    # DSGVO
    scheduled_deletion_at = DateTimeField()
    
    class Meta:
        unique_together = ("council", "email")
        indexes = [
            Index(fields=["council", "round_1_status"]),
            Index(fields=["scheduled_deletion_at"]),
        ]


class SortitionRound(base.TimeStampedModel):
    """Ein Losprozess-Durchlauf (z.B. erste Stichprobe oder Zweitlosung)."""
    council = FK(CitizenCouncil)
    round_number = IntegerField(choices=[(1, "Erstlosung"), (2, "Zweitlosung")])
    
    population_size = IntegerField()  # z.B. 300.000
    sample_size = IntegerField()      # z.B. 5.000
    
    stratification_config = JSONField()  # Gewichtungen pro Schicht
    
    executed_at = DateTimeField()
    seed = IntegerField()  # Für Reproduzierbarkeit
    
    result_json = JSONField()  # Audit-Trail: {strategy, scores, selected_ids}
    
    class Meta:
        unique_together = ("council", "round_number")


class InvitationBatch(base.TimeStampedModel):
    """Batch von Brief-Generierungen (für Massenversand-Tracking)."""
    council = FK(CitizenCouncil)
    sortition_round = FK(SortitionRound)
    
    generated_count = IntegerField()
    sent_count = IntegerField(default=0)
    failed_count = IntegerField(default=0)
    
    zip_file = FileField(upload_to="buergerrat/letters/%Y/%m/")
    
    created_at = DateTimeField(auto_now_add=True)
    sent_at = DateTimeField(null=True)
```

#### 2.2.3 Stratifikations-Engine (`sortition.py`)

```python
# apps/buergerrat/sortition.py (Pseudocode)

from panelot import sample as panelot_sample

def execute_stratified_lottery(samples, stratification_fields, target_size, seed=None):
    """
    Führt stratifizierte Zufallsstichprobe aus.
    
    Args:
        samples: QuerySet von MelderegisterSample
        stratification_fields: ["age_group", "gender", "district"]
        target_size: z.B. 5000
        seed: Optional, für Reproduzierbarkeit
    
    Returns:
        list von sample IDs (für Audit-Trail)
    """
    # Baue Strata-Tabelle
    strata_df = pd.DataFrame(samples.values(
        'id', 'age_group', 'gender', 'district'
    ))
    
    # Nutze panelot für stratifizierte Auswahl
    selected = panelot_sample(
        df=strata_df,
        strata_cols=stratification_fields,
        sample_size=target_size,
        random_state=seed,
    )
    
    return selected['id'].tolist()
```

#### 2.2.4 PDF-Brief-Generator (`mail.py`)

```python
# apps/buergerrat/mail.py (Pseudocode)

from weasyprint import HTML, CSS
from django.template.loader import render_to_string
from django.urls import reverse

def generate_invitation_letters(samples, council):
    """
    Generiert PDF-Serienbriefe mit Token.
    
    Args:
        samples: QuerySet von MelderegisterSample, gefiltert nach round_1_status="invited"
        council: CitizenCouncil instance
    
    Returns:
        Path zu ZIP-Datei mit 5000 PDFs
    """
    pdf_files = []
    
    for sample in samples.iterator(chunk_size=100):
        context = {
            'citizen_name': decrypt(sample.encrypted_data)['name'],
            'token': sample.user.participantinvite_set.first().token,
            'deadline': council.rsvp_deadline,
            'project_url': council.project.get_absolute_url(),
        }
        
        html_string = render_to_string(
            'buergerrat/invitation_letter.html',
            context,
        )
        
        pdf = HTML(string=html_string).render().write_pdf()
        
        filename = f"letter_{sample.id}.pdf"
        pdf_files.append((filename, pdf))
    
    # Zu ZIP packen
    zip_path = ...
    with zipfile.ZipFile(zip_path, 'w') as zf:
        for filename, pdf in pdf_files:
            zf.writestr(filename, pdf)
    
    return zip_path
```

#### 2.2.5 Admin-Interface

```python
# apps/buergerrat/admin.py (Pseudocode)

class MelderegisterSampleInline(admin.TabularInline):
    model = MelderegisterSample
    extra = 0
    readonly_fields = ["user", "round_1_status", "round_2_status", "scheduled_deletion_at"]


class CitizenCouncilAdmin(admin.ModelAdmin):
    list_display = ["name", "organisation", "first_sample_size", "rsvp_deadline"]
    actions = ["execute_first_lottery", "execute_second_lottery", "generate_invitation_letters"]
    
    inlines = [MelderegisterSampleInline]
    
    @admin.action(description="Erstlosung ausführen")
    def execute_first_lottery(self, request, queryset):
        for council in queryset:
            SortitionRound.objects.create(
                council=council,
                round_number=1,
                population_size=council.melderegstersample_set.count(),
                sample_size=council.first_sample_size,
                executed_at=timezone.now(),
                seed=random.randint(0, 2**31),
            )
            # ... Aufruf execute_stratified_lottery
    
    @admin.action(description="Einladungsbriefe generieren")
    def generate_invitation_letters(self, request, queryset):
        for council in queryset:
            batch = InvitationBatch.objects.create(
                council=council,
                sortition_round=council.sortitionround_set.filter(round_number=1).first(),
            )
            # Celery Task starten
            tasks.generate_letters_async.delay(batch.id)
```

#### 2.2.6 Celery-Tasks für Background-Work

```python
# apps/buergerrat/tasks.py

@shared_task
def generate_letters_async(batch_id):
    """Generiert Briefe asynchron (weg vom Request-Cycle)."""
    batch = InvitationBatch.objects.get(id=batch_id)
    samples = batch.sortition_round.council.melderegstersample_set.filter(
        round_1_status="invited"
    )
    zip_path = generate_invitation_letters(samples, batch.council)
    batch.zip_file = zip_path
    batch.generated_count = samples.count()
    batch.save()


@periodic_task(run_every=crontab(hour=0, minute=0))  # Täglich um 00:00
def delete_expired_registration_data():
    """
    DSGVO-Compliance: Lösche Melderegister-Daten nach Aufbewahrungsfrist.
    """
    expired = MelderegisterSample.objects.filter(
        scheduled_deletion_at__lte=timezone.now()
    )
    for sample in expired:
        # Anonymisiere statt zu löschen (für Audit-Trail)
        sample.encrypted_data = b"[DELETED]"
        sample.email = f"deleted_{sample.id}@void.local"
        sample.save()
```

#### 2.2.7 DSGVO-Konformität

Jede `MelderegisterSample`:
1. Hat `scheduled_deletion_at = created_at + timedelta(days=data_retention_days)`
2. Wird nach dieser Frist durch den Celery-Task anonymisiert
3. Audit-Trail in `SortitionRound.result_json` bleibt (nur IDs, keine PII)

Datenschutz-Architektur:
- AES-256-Verschlüsselung mit Django's `SecretKey` (rotierbar)
- Separate DB-Spalten für Stratifikationsdaten (die dürfen länger bleiben)
- Logging aller Losprozesse (wer, wann, mit welchem Seed)

#### 2.2.8 Integration mit adhocracy-plus

**Private Project:** 
- Erweitere `adhocracy4.projects.Project` (via Proxy-Model oder Signal) um `access` Feld
- oder: `CitizenCouncil.project` ist privat per Convention (Admin setzt `is_draft`)

**Partizipanten-Management:**
- `MelderegisterSample.user` wird nach erfolgreicher Registration gesetzt
- `ParticipantInvite` wird in Standard-Invite-Flow erstellt
- Nach Zweitlosung: nur ausgewählte User bleiben in `project.participants`

**Offline-Events:**
- `CitizenCouncil` kann mehrere `OfflineEvent` haben
- Optional: `OfflineEvent.citizen_council` FK (aber nicht erzwungen, bestehende Events funktionieren)

---

### 2.3 Aufwands-Schätzung

#### Variante A (Minimal)

| Task | Person-Tage |
|------|-------------|
| Schulung Stadt (Sortition Foundation, CSV) | 2 |
| Dokumentation (Prozess, Fehlerbehandlung) | 3 |
| **Summe** | **5 PT** |

- **Kosten (mit Team):** ~€2.000–€3.000
- **Time-to-Market:** 1 Woche
- **Risiko:** Hoch (manuelle Fehler)

#### Variante B (Saubere Lösung)

| Task | Person-Tage |
|------|-------------|
| **Models + Migrations** | 4 |
| **Sortition-Engine** (Panelot Integration) | 3 |
| **PDF-Brief-Generator** (weasyprint) | 3 |
| **Celery-Tasks** (Batching, Auto-Delete) | 3 |
| **Admin-Interface** (Custom Actions) | 4 |
| **Tests** (Models, Sortition, Mail, Integration) | 5 |
| **Docs + User-Guide** | 2 |
| **DSGVO-Review** (mit Datenschützer) | 2 |
| **Deployment + Schulung** | 2 |
| **Puffer (15%)** | 3 |
| **Summe** | **31 PT** |

- **Kosten (mit Senior Dev + Junior + QA):** ~€15.000–€20.000
- **Time-to-Market:** 4–6 Wochen (mit Iteration)
- **Risiko:** Niedrig (getestet, dokumentiert)

---

## 3. Upstream oder Fork?

### 3.1 Upstream-Argument (Pro)

**Warum es upstream sein *könnte:***
- Bürgerräte sind zukunftsträchtig (Demokratie-Trend, EU/OECD)
- Andere Städte (Paris, Helsinki, Lissabon) haben ähnliche Prozesse
- adhocracy4 ist *designed* für Modularität

**Aber: Konkreter Gegenwind**

1. **Zu spezialisiert:**
   - Bürgerrat = ≠ allgemeines "Private Project mit mehrstufigen Losen"
   - § 46 BMG ist ein **Deutsches Gesetz** — nicht global relevant
   - Papierpost + Melderegister-Integration = ultra-nische

2. **Migrations-Komplexität:**
   - Wie in `docs/contributing.md` steht (Zeile 36–42):  
     *"Migrations sind sensitiv für Forks. Vermeidet Änderungen an bestehenden Models; nutzt stattdessen Form-Level-Changes oder neue Apps."*
   - Neue dedizierte App = **exakt das empfohlene Pattern!**
   - Upstream würde heißen: `adhocracy4.projects.models.Project` verändern → Migrations-Nightmare für alle Forks

3. **Governance:**
   - Liquid Democracy e.V. wartet auf "Feature Requests" über adhocracy.plus/feedback
   - Ein ganzer Bürgerrat-Workflow ist zu groß für Quick-Review
   - Besser: Liaison + Dokumentation, damit sie das Design später port-en können

### 3.2 Fork-Argument (Pro)

**Warum Fork die richtige Wahl ist:**

1. **Neue App, nicht Kern-Modell-Änderungen:**
   - `apps/buergerrat/` ist isoliert
   - Keine Migrations-Konflikte
   - Kann bei Upstream-Upgrades mitgenommen werden (rebase auf main)

2. **Stadt ist Pilot, nicht Community:**
   - Dieses Projekt ist für **eine Stadt**, nicht für "alle adhocracy-plus User"
   - Fork erlaubt Spezialfall-Handling ohne adhocracy+ zu "verunreinigen"

3. **Iterative Verbesserung:**
   - Stadt sieht System in Aktion
   - Feedback nach Echtbetrieb
   - Dann: Port an adhocracy+ (oder auch nicht, wenn es nur diese Stadt braucht)

### 3.3 Empfehlung

**→ FORK + neue App `apps/buergerrat/`**

**Begleitmaßnahmen:**
1. **Kontakt mit Liquid Democracy e.V.:**
   - Schreib eine Zusammenfassung (nicht mehr als 2 Seiten)
   - Zeige, wie `apps/buergerrat/` das Design nicht verletzt
   - Frag: "Wollen wir später zusammenmergen?"

2. **Public Documentation:**
   - `docs/buergerrat/` im Repo (für andere Städte)
   - "So nutzt ihr unsere Citizen Council App"

3. **Pflege des Upstream-Kontakts:**
   - Rebase alle 3 Monate auf `main`
   - Nutze Liquid Democracy's Feedback-Platform für Improvements (nicht als Bug-Reports)

---

## 4. Migrations-Sensitivität (Konsequenzen für Design)

Aus `docs/contributing.md:36–42`:

> *Migrations sind eine Liste von Datenbankschema-Änderungen. Wenn zwei Branches das gleiche Model ändern, entstehen Konflikte, die nicht automatisch rebased werden können.*  
> *Deshalb: Modelle in bestehenden Apps nicht ändern. Stattdessen: Form-Level-Changes oder neue Apps für Module.*

### 4.1 Was das für uns bedeutet

**❌ NICHT MACHEN:**
```python
# FALSCH: Ändere apps/projects/models.py
Project.add_field(access=CharField(...))  # → Migration 0XXX_add_project_access.py
```
→ Jeder Fork (inkl. adhocracy+ upstream) hat jetzt eine konkurrierende Migration

**✅ MACHEN:**
```python
# RICHTIG: Neue App
apps/buergerrat/models.py
  class CitizenCouncil(models.Model):
      project = OneToOneField(Project)  # Relation, nicht Änderung
      ...
```
→ Nur eine neue Migration in `apps/buergerrat/migrations/`

### 4.2 Anwendung in Variante B

Alle Modelle sind in `apps/buergerrat/`:
- Keine Änderung an `apps/projects/models.py`, `apps/users/models.py`, etc.
- Nur neue M2M-Relations und ForeignKeys *zu* bestehenden Models
- = **Upstream kann jederzeit rebase**, ohne Konflikte

**Dies ist ein großer Punkt für Fork-Freundlichkeit!**

---

## 5. Erste konkrete Schritte (Issue-System)

Für Variante B (saubere Lösung):

### Issue 1: Modelle & Datenbank-Schema

**Titel:** `[buergerrat] Models & Migrations: CitizenCouncil, MelderegisterSample, SortitionRound`

**Beschreibung (1-Satz):**  
Definiere Core-Models für Bürgerrat-Workflow (Council, Register-Import, Losprozesse) mit vollständiger DSGVO-Retention-Policy.

**Akzeptanzkriterien:**
- [ ] `CitizenCouncil`, `MelderegisterSample`, `SortitionRound`, `InvitationBatch` Models
- [ ] Verschlüsselung für PII in `encrypted_data` (AES-256)
- [ ] Celery-Task für Auto-Löschung nach Retention-Frist
- [ ] Migrations erstellt
- [ ] Admin-Registrierung für alle Models
- [ ] Tests: Model-Relationships, Constraints (unique_together), Deletion-Cascade
- [ ] Docs: DSGVO-Architektur (Gesamtüberblick)

**Priorität:** P0 (Blocker für alles andere)  
**Estimate:** 4 PT

---

### Issue 2: CSV-Import & Stratifikations-Konfiguration

**Titel:** `[buergerrat] CSV-Upload & Stratifikations-Config: MelderegisterSample Import mit Validierung`

**Beschreibung (1-Satz):**  
Implementiere CSV-Upload-Form und View zum Importieren von Melderegister-Daten mit Stratifikations-Metadaten (Alter, Geschlecht, Stadtteil).

**Akzeptanzkriterien:**
- [ ] `apps/buergerrat/forms.py`: CSV-Upload-Form mit Validierung (required columns, dedup)
- [ ] `apps/buergerrat/views.py`: Import-View (permissions check, error handling)
- [ ] Verschlüsselung: PII in `encrypted_data`, Strata-Felder in plaintext DB
- [ ] Bulk-Create mit `batch_size` (für Performance)
- [ ] Tests: Valid CSV, Missing columns, Duplicates, Large files (>100.000 Zeilen)
- [ ] UI: Admin-Interface oder separate Form-Page

**Priorität:** P0  
**Estimate:** 3 PT

---

### Issue 3: Stratifizierter Zufalls-Sampling

**Titel:** `[buergerrat] Sortition-Engine: Stratifizierte Zufallsstichprobe mit Audit-Trail`

**Beschreibung (1-Satz):**  
Implementiere stratifizierten Sampling-Algorithmus (via `panelot`) mit Reproduzierbarkeit und vollständigem Audit-Trail für beide Losprozess-Phasen.

**Akzeptanzkriterien:**
- [ ] `apps/buergerrat/sortition.py`: `execute_stratified_lottery(samples, strata, target_size, seed)`
- [ ] Dependency: `pip install panelot`
- [ ] `SortitionRound` speichert seed + result_json (für Audit)
- [ ] Management-Command: `python manage.py execute_lottery --council=<id> --round=1`
- [ ] Tests: 
  - Sampling ergeben rechte Größe
  - Same seed → Same result (Reproduzierbarkeit)
  - Strata werden respektiert (Proportion-Check)
  - Edge-cases (kleiner als target_size, leere Strata)

**Priorität:** P0  
**Estimate:** 3 PT

---

### Issue 4: PDF-Brief-Generierung & Batch-Versand

**Titel:** `[buergerrat] PDF-Serienbriefe: Massenversand mit Token`

**Beschreibung (1-Satz):**  
Implementiere PDF-Serienbrief-Generator mit Celery-Batching für Massenversand von 5.000+ Einladungen mit eindeutigen Tokens.

**Akzeptanzkriterien:**
- [ ] Template: `apps/buergerrat/templates/invitation_letter.html` (HTML-to-PDF)
- [ ] `apps/buergerrat/mail.py`: `generate_invitation_letters(samples, council) → zip_path`
- [ ] Dependency: `pip install weasyprint`
- [ ] Celery-Task: `generate_letters_async(batch_id)` mit Batch-Tracking
- [ ] `InvitationBatch`: Generated, Sent, Failed Counts
- [ ] Output: ZIP-Datei mit PDF-Einzeldateien (+ CSV mit Versand-Adressen)
- [ ] Tests:
  - PDF wird generiert und ist gültig
  - Token sind unterschiedlich pro Brief
  - Batch-Handling (100 Briefe gleichzeitig)
  - Error handling (fehlerhafte Decryption)

**Priorität:** P0  
**Estimate:** 3 PT

---

### Issue 5: Admin-Interface für Stadtverwaltung

**Titel:** `[buergerrat] Admin UI: Bürgerrat-Workflow für Stadtverwaltung`

**Beschreibung (1-Satz):**  
Implementiere Django Admin-Customization für Stadtverwaltungs-Workflow (Erstlosung, Briefversand, Zweitlosung, Ergebnisse).

**Akzeptanzkriterien:**
- [ ] `apps/buergerrat/admin.py`: `CitizenCouncilAdmin` mit Custom Actions
- [ ] Actions:
  - "Erstlosung ausführen" (via Sortition-Engine)
  - "Briefversand-Batch starten" (via Celery)
  - "Zweitlosung ausführen" (von Rückmeldungen)
  - "Ergebnisse exportieren" (JSON/CSV)
- [ ] Inline für `MelderegisterSample` (Read-Only nach Import)
- [ ] Permissions: Nur Stadtverwaltungs-User können diese Aktionen
- [ ] Tests: Permission-Checks, Action-Triggers

**Priorität:** P0  
**Estimate:** 4 PT

---

### Issue 6: Integration mit Private Project & Invite-Flow

**Titel:** `[buergerrat] Integration: Private Project + Token-Invite Flow anpassen`

**Beschreibung (1-Satz):**  
Verbinde Bürgerrat-Losprozess mit adhocracy-plus Participant-Invite-System und Private Project-Access.

**Akzeptanzkriterien:**
- [ ] Nach Erstlosung: `ParticipantInvite` wird für jeden User erstellt
- [ ] Token aus Invite wird in Brief-PDF eingebettet
- [ ] Private Project: `CitizenCouncil.project` ist nicht öffentlich (via `is_draft` oder neues Access-Feld)
- [ ] Nach Zweitlosung: Nur ausgewählte User in `project.participants`
- [ ] Invite-Flow: User registriert sich → akzeptiert Invite → wird Teilnehmer
- [ ] Tests: Invite-Flow, Project-Access-Control

**Priorität:** P0  
**Estimate:** 3 PT

---

### Issue 7: Tests & DSGVO-Compliance-Audit

**Titel:** `[buergerrat] Testing & DSGVO-Review: Vollständige Test-Suite + Datenschutz-Audit`

**Beschreibung (1-Satz):**  
Schreibe Test-Coverage (>90%) für alle Models, Logik, Tasks und führe DSGVO-Audit mit Datenschützer durch.

**Akzeptanzkriterien:**
- [ ] Unit-Tests: 
  - `test_models.py` (Relationships, Constraints, Lifecycle)
  - `test_sortition.py` (Sampling-Logik, Reproduzierbarkeit)
  - `test_mail.py` (PDF-Gen, Token-Einbettung)
  - `test_tasks.py` (Celery-Tasks, Auto-Delete)
- [ ] Integration-Tests: Full Workflow (CSV → Invite → Registration → Voting)
- [ ] Performance-Tests: 300.000 Records Import, 5.000 PDFs in Batch
- [ ] DSGVO-Audit (mit Datenschützer/Jurist):
  - [ ] Retention Policies sind rechtens
  - [ ] Encryption ist angemessen
  - [ ] Audit-Trails sind ausreichend
  - [ ] Datenschutzerklärung (Templates) angepasst
- [ ] Coverage: `make coverage` → >90%

**Priorität:** P0  
**Estimate:** 5 PT

---

### Issue 8: Dokumentation & Schulung

**Titel:** `[buergerrat] Docs & User Guide: Bürgerrat-Prozess für Stadtverwaltung`

**Beschreibung (1-Satz):**  
Schreibe vollständige Dokumentation (Prozess, Admin-Handbook, FAQ) und führe Schulung mit Stadt durch.

**Akzeptanzkriterien:**
- [ ] `docs/buergerrat/` (new directory):
  - `01_overview.md` — Was ist Bürgerrat in adhocracy-plus?
  - `02_architecture.md` — Technical Deep-Dive (Models, Sortition, DSGVO)
  - `03_admin_handbook.md` — Schritt-für-Schritt für Stadtverwaltung
  - `04_troubleshooting.md` — FAQs, Fehlerbehandlung
  - `05_data_retention.md` — DSGVO Frist & Auto-Löschung
- [ ] Schulung: 2–4 Stunden für Stadtverwaltungs-Team
- [ ] Deployment-Guide (Produktion)

**Priorität:** P1  
**Estimate:** 2 PT

---

## 6. Fazit & Handlungsempfehlungen

### 6.1 Sofort (heute)

1. **Entscheid treffen:** Minimal-Hack (A) vs. Saubere Lösung (B)?
   - Minimal geht schneller, fragiler
   - Saubere Lösung kostet mehr, ist wartbar und DSGVO-ready

2. **Kontakt mit Liquid Democracy e.V.:**
   - "Wir machen einen Bürgerrat-Workflow als Fork. Okay?"
   - Design-Austausch (2–3h Call)

### 6.2 Bei Variante B (empfohlen)

1. **Issue-Triage:** Priorisiere obige 8 Issues
2. **Sprint-Plan:** 
   - Issues 1–3 (Models, Import, Sortition): 2 Wochen (Sprint 1)
   - Issues 4–6 (Mail, Admin, Integration): 2 Wochen (Sprint 2)
   - Issue 7–8 (Tests, Docs): 1–2 Wochen (Sprint 3)
3. **Kick-off mit Stadt:** Prozess-Validation vor Coding

### 6.3 Langfristig

- Nach erfolgreichem Pilot: Upstream-Proposal an adhocracy4?
- Oder: Separate Repo (`adhocracy-citizen-council`) für Reusability?
- Lizenz: Muss mit adhocracy-plus kompatibel sein (AGPL 3.0)

---

## Quellen im Codebase

Die Analyse basiert auf:

1. `/root/workspace/CLAUDE.md` — Project Overview, Architecture
2. `/root/workspace/.issues/MAP.md` — Codebase-Struktur
3. `/root/workspace/docs/software_architecture.md` — Data Model, Module Pattern
4. `/root/workspace/docs/contributing.md` — Fork-Guidelines, Migrations
5. `/root/workspace/apps/projects/models.py:12–88` — Invite-System
6. `/root/workspace/apps/projects/views.py:34–93` — Invite-Flow
7. `/root/workspace/apps/users/models.py:20–60` — User-Model (keine demografischen Felder)
8. `/root/workspace/apps/offlineevents/models.py:23–66` — Offline-Events Integration
9. `/root/workspace/apps/dashboard/blueprints.py:13–150` — Blueprint-Pattern, Module-Registration

---

**Dokument-Ende**
