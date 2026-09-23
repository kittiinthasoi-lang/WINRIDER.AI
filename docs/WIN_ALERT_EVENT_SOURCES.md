# WIN Alert Event Intelligence Sources

Updated: 2026-09-23

WIN Alert must prefer real, attributable event data. It must never invent a public
concert, sports fixture, festival, market, venue, date or coordinate to fill an empty UI.

## Active sources

### 1. TAT Data Catalog — Open Data

Primary nationwide free source. The tourism-activity dataset includes festivals,
traditions, music, sports, food festivals, cultural events and other tourism
activities. WINRIDER already synchronizes the JSON resource directly and stores
the source URL, provider record ID, source modification metadata and coordinates
when supplied by the dataset.

No API key is required.

### 2. Ticketmaster Discovery API — optional free developer API

Used as an additional source for scheduled concerts, sports, fan meetings,
performances and other ticketed events in Thailand.

Set server secret:

`TICKETMASTER_DISCOVERY_API_KEY`

The sync searches country code `TH`, keeps only records with a real event date
and venue coordinates, preserves the Ticketmaster event URL as source/ticket
link, and removes stale Ticketmaster records independently from TAT records.

If the key is not configured, Ticketmaster is skipped without affecting TAT.

### 3. WINRIDER Bible data — internal context only

`src/data/bibleData.ts` contains `LAUNCH_TIMELINE`. WIN Alert shows incomplete
Bible milestones in a clearly labelled **WINRIDER Bible • Internal Milestones**
section.

These records are intentionally not inserted into `winAlertEvents` because the
Bible timeline uses relative day ranges rather than confirmed public dates and
venues. The UI must not convert them into fake public events or enable a ride to
an invented location. Once an internal milestone receives a real date and venue,
it can be promoted through a future internal-event publishing workflow.

## API

`GET /api/events/daily?date=YYYY-MM-DD&days=1|7|30&country=TH`

The response:
- merges all source-driven public event records
- filters events whose date ranges overlap the requested window
- requires real coordinates before an event can be returned for ride booking
- classifies sale / market / concert / sports / festival / community / other
- deduplicates likely duplicate events by date + normalized title + venue
- returns per-event source attribution and optional source/ticket URLs

## Scheduled sync

GitHub Actions workflow:

`.github/workflows/win-alert-event-sync.yml`

It calls:

`POST /api/internal/events/sync`

every two hours. The endpoint synchronizes TAT events and, when configured,
Ticketmaster.

Required deployment/GitHub configuration:
- `WINRIDER_APP_URL`
- `WIN_ALERT_INTERNAL_SYNC_SECRET` (or legacy `TAT_INTERNAL_SYNC_SECRET`)
- optional server-side `TICKETMASTER_DISCOVERY_API_KEY`

## Source acceptance rules

A new source may be added when:
1. its data is public or properly licensed for this use;
2. its origin is attributable;
3. dates are explicit and machine-parseable;
4. venue identity is present;
5. coordinates are supplied or resolved by an authorized provider;
6. stale data can be removed without deleting another source's records;
7. source-specific terms are respected.

Province-only or stale calendars discovered on open-data portals should not be
blindly mixed into current nationwide alerts. They can be connected as curated
sources after freshness and location quality are verified.
