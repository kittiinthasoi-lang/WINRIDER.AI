# WIN Alert Event Intelligence Sources

Updated: 2026-09-23

WIN Alert uses attributable public data and must never invent a concert, sports
fixture, festival, market, venue, date, or coordinate to fill an empty UI.

## Active sources

### 1. TAT Data Catalog — Open Data

Primary nationwide public source for tourism activities including festivals,
traditions, music, sports, food festivals and cultural events. WINRIDER stores
source attribution, provider record IDs, source metadata and coordinates when
the dataset provides them.

No provider API key is required.

### 2. WIN Public Data

Additional source-driven records may be stored in `publicDataRecords` when
their source, freshness, license/terms and coordinates are suitable. Event
records are merged with `winAlertEvents`, deduplicated and shown with source
attribution.

### 3. WINRIDER Bible data — internal context only

`src/data/bibleData.ts` milestones remain internal context unless a real date,
venue and coordinates are published. They are never converted into fake public
events.

## API

`GET /api/events/daily?date=YYYY-MM-DD&country=TH&latitude=...&longitude=...`

The response:
- merges source-driven public event records
- filters by the requested date
- requires real coordinates for ride booking
- classifies sale / market / concert / sports / festival / community / other
- deduplicates likely duplicate events
- optionally sorts by straight-line distance from the user's real GPS
- returns source attribution and source URLs

## Scheduled sync

The internal event sync endpoint is:

`POST /api/internal/events/sync`

It synchronizes TAT/Public Data sources using the internal scheduler secret.
There is no Ticketmaster developer key or paid event-provider key requirement.

Required deployment/GitHub configuration:
- `WINRIDER_APP_URL`
- `WIN_ALERT_INTERNAL_SYNC_SECRET` (or legacy `TAT_INTERNAL_SYNC_SECRET`)

## Source acceptance rules

A source may be added when:
1. the data is public or properly licensed for this use;
2. the origin is attributable;
3. dates are explicit and machine-parseable;
4. venue identity is present;
5. coordinates are supplied by the source or another authorized public dataset;
6. stale records can be removed safely;
7. source-specific terms and attribution requirements are respected.

Navigation from an event is handed to an external map application; WIN Alert
does not require a paid map API key.
