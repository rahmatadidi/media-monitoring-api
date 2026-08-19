# Peoplen Pixel

Peoplen Pixel is a media monitoring backend API for ingesting, normalizing, searching, and analyzing media mentions from multiple sources.

The service is built with Node.js, TypeScript, Express, and PostgreSQL. It provides APIs for bulk ingestion, mention search, and statistics that can be consumed by dashboards, reporting tools, or other internal services.

## Features

- Bulk ingestion of media mentions
- Idempotent ingestion for safe retries
- Source normalization
- HTML content cleaning
- Date normalization
- Engagement number normalization
- URL canonicalization
- Mention deduplication
- Keyword search across title and content
- Filtering by source and publication date
- Stable pagination
- Statistics grouped by source or day
- PostgreSQL-backed persistence
- Integration tests for the main API flows

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- `pg`
- Vitest
- Supertest
- dotenv

## Requirements

Before running the application, make sure you have:

- Node.js 18+
- PostgreSQL 14+
- npm

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/rahmatadidi/media-monitoring-api.git
cd peoplen-pixel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

Make sure the PostgreSQL database already exists.

### 4. Run database migration

```bash
npm run migrate
```

This creates the required database schema and indexes.

### 5. Start the application

For development:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

For a production-style build:

```bash
npm run build
npm start
```

---

# API Reference

## Health Check

Check whether the API and PostgreSQL connection are available.

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "database": "connected",
  "time": "2026-08-19T10:00:00.000Z"
}
```

---

## Bulk Ingest

Ingest multiple mentions in a single request.

```http
POST /internal/mentions/bulk
```

### Request body

The request body must be a JSON array of mention objects.

Example:

```json
[
  {
    "external_id": "example-001",
    "source": "The Star",
    "title": "Example article",
    "content": "<p>Example article content.</p>",
    "url": "https://example.com/article/1",
    "author": "John Doe",
    "published_at": "2026-08-19T10:00:00Z",
    "engagement": "120"
  }
]
```

### Response

```json
{
  "received": 1,
  "inserted": 1,
  "duplicates": 0
}
```

The response contains:

| Field        | Description                                                |
| ------------ | ---------------------------------------------------------- |
| `received`   | Number of records received                                 |
| `inserted`   | Number of new mentions stored                              |
| `duplicates` | Number of records already represented by existing mentions |

### Idempotency

The endpoint is designed to be safely retried.

Submitting the same mention multiple times does not create additional rows.

For example, submitting the same dataset twice may produce:

```json
{
  "received": 15,
  "inserted": 14,
  "duplicates": 1
}
```

on the first request, followed by:

```json
{
  "received": 15,
  "inserted": 0,
  "duplicates": 15
}
```

on the second request.

---

# Search Mentions

Search and filter stored mentions.

```http
GET /mentions
```

## Query parameters

| Parameter | Description                             |
| --------- | --------------------------------------- |
| `q`       | Keyword search across title and content |
| `source`  | Filter by normalized source             |
| `from`    | Inclusive publication date/time         |
| `to`      | Exclusive publication date/time         |
| `page`    | Page number, starting from `1`          |

The page size is currently fixed at `5`.

### Example

```http
GET /mentions?q=ringgit&source=the%20star&page=1
```

### Example response

```json
{
  "data": [
    {
      "id": 1,
      "external_id": "example-001",
      "source": "The Star",
      "source_normalized": "the star",
      "title": "Example article",
      "content_text": "Example article content.",
      "url": "https://example.com/article/1",
      "author": "John Doe",
      "published_at": "2026-08-19T10:00:00.000Z",
      "engagement": 120
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 5,
    "total": 1,
    "total_pages": 1
  }
}
```

## Pagination and sorting

Results use a stable ordering:

```text
published_at DESC NULLS LAST
id DESC
```

This means newer mentions appear first, while `id` provides a deterministic tie-breaker when multiple records have the same publication timestamp.

Example:

```http
GET /mentions?page=2
```

---

# Mention Statistics

Retrieve aggregated mention counts for dashboard and reporting use cases.

## Group by source

```http
GET /mentions/stats?group_by=source
```

Example response:

```json
{
  "group_by": "source",
  "data": [
    {
      "group": "the star",
      "count": 14
    },
    {
      "group": "new straits times",
      "count": 9
    }
  ]
}
```

## Group by day

```http
GET /mentions/stats?group_by=day
```

Example response:

```json
{
  "group_by": "day",
  "data": [
    {
      "group": "2026-08-18",
      "count": 8
    },
    {
      "group": "2026-08-19",
      "count": 15
    }
  ]
}
```

The `group_by` parameter currently supports:

- `source`
- `day`

---

# Data Normalization

Incoming mention data can come from different sources and may contain inconsistent formats.

Before storing a mention, the ingestion pipeline normalizes several fields.

## Source normalization

Source names are converted into a consistent representation.

For example:

```text
"The Star"
"thestar"
"THE STAR"
```

can be represented internally as:

```text
the star
```

Known aliases are handled explicitly, while unknown sources are normalized generically.

## Content normalization

Raw HTML is preserved in the original `content` field while a cleaned `content_text` representation is generated for search.

For example:

```html
<p>This is an article.</p>
```

becomes:

```text
This is an article.
```

Script and style elements are removed from the searchable text.

## Date normalization

Different date representations are converted into PostgreSQL `TIMESTAMPTZ`.

Supported input includes ISO-like timestamps and supported date formats from the ingestion data.

Invalid or missing dates are stored as `NULL`.

## Engagement normalization

Engagement values may arrive as numbers or strings.

Examples:

```text
"120"
"1,200"
120
```

are normalized to integer values.

Invalid or negative values are treated as `NULL`.

## URL canonicalization

URLs are normalized before generating the article identity.

Tracking parameters such as:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
fbclid
gclid
```

are removed.

URL fragments are also removed.

This prevents tracking variations of the same URL from being treated as different articles.

---

# Duplicate Detection

The system distinguishes between an individual mention and the underlying article.

A mention is identified using:

```text
source_normalized + external_id
```

The combination is hashed into `mention_key`.

This means two records from the same source with the same external ID represent the same mention and are treated as duplicates.

The underlying article is separately represented by `article_key`.

When a canonical URL exists, the article key is based on the canonical URL.

When a canonical URL is unavailable, the system falls back to a fingerprint based on:

```text
source + normalized title + published_at
```

This allows multiple mentions of the same article to remain separate while still being associated with the same underlying article where possible.

The database enforces uniqueness on `mention_key`, which provides a database-level guarantee for idempotent ingestion.

---

# Database Schema

The application uses PostgreSQL with an explicit SQL migration.

The main table is:

```text
mentions
```

Important fields include:

| Column              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `id`                | Internal database identifier                |
| `external_id`       | Source-provided mention identifier          |
| `source`            | Original source name                        |
| `source_normalized` | Normalized source name                      |
| `title`             | Original mention title                      |
| `content`           | Original content                            |
| `content_text`      | HTML-cleaned content used for search        |
| `url`               | Original URL                                |
| `canonical_url`     | Normalized URL                              |
| `author`            | Mention author                              |
| `published_at`      | Normalized publication timestamp            |
| `engagement`        | Normalized engagement value                 |
| `article_key`       | Identifier for the underlying article       |
| `mention_key`       | Unique identifier for an individual mention |
| `created_at`        | Record creation timestamp                   |
| `updated_at`        | Last update timestamp                       |

Indexes are provided for common access patterns including:

- normalized source
- publication date
- source + publication date
- article key
- canonical URL

The schema is created through:

```text
migrations/001_create_mentions.sql
```

and is not dependent on manually created database objects.

---

# Project Structure

```text
peoplen-pixel/
├── data/
│   └── seed_mentions.json
├── migrations/
│   └── 001_create_mentions.sql
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── config.ts
│   ├── db/
│   │   ├── migrate.ts
│   │   └── pool.ts
│   └── mentions/
│       ├── mention.controller.ts
│       ├── mention.normalizer.ts
│       ├── mention.repository.ts
│       ├── mention.routes.ts
│       ├── mention.search.controller.ts
│       ├── mention.search.repository.ts
│       ├── mention.search.service.ts
│       ├── mention.service.ts
│       ├── mention.stats.controller.ts
│       ├── mention.stats.repository.ts
│       └── mention.type.ts
├── test/
│   ├── mention.bulk.integration.test.ts
│   ├── mention.normalizer.test.ts
│   ├── mention.search.integration.test.ts
│   ├── mention.stats.integration.test.ts
│   └── test-db.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

The application follows a simple layered structure:

```text
HTTP Request
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
PostgreSQL
```

Normalization is handled before persistence so that database records remain consistent and query logic stays focused on database operations.

---

# Testing

The project uses Vitest and Supertest.

Run the complete test suite:

```bash
npm test
```

Run type checking:

```bash
npm run typecheck
```

The test suite currently covers:

- mention normalization
- source normalization
- HTML cleaning
- date parsing
- engagement parsing
- URL canonicalization
- bulk ingestion
- idempotent ingestion
- duplicate detection
- search pagination
- keyword search
- source filtering
- date filtering
- stable ordering
- statistics grouping

The integration tests use PostgreSQL rather than mocking the database so that the ingestion, search, and statistics behavior is tested against the actual persistence layer.

---

# Development Commands

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start development server with automatic reload |
| `npm run build`     | Compile TypeScript                             |
| `npm start`         | Start compiled application                     |
| `npm run typecheck` | Run TypeScript type checking                   |
| `npm run migrate`   | Run database migration                         |
| `npm test`          | Run test suite                                 |

---

# Environment Variables

The application uses the following environment variables:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

| Variable       | Description                  | Default  |
| -------------- | ---------------------------- | -------- |
| `PORT`         | HTTP server port             | `3000`   |
| `DATABASE_URL` | PostgreSQL connection string | Required |

Do not commit `.env` files containing credentials.

Use `.env.example` as the template for local configuration.

---

# Troubleshooting

## Database connection failed

Check that:

1. PostgreSQL is running.
2. The database exists.
3. `DATABASE_URL` is correct.
4. The configured PostgreSQL user has access to the database.

## Migration fails

Make sure the database configured in `DATABASE_URL` exists before running:

```bash
npm run migrate
```

## Port already in use

Change the port in `.env`:

```env
PORT=3001
```

Then restart the application.

## Invalid database configuration

Make sure the connection string follows the PostgreSQL format:

```text
postgresql://username:password@host:port/database
```

---

# Design Notes

The application intentionally keeps the architecture relatively small.

An ORM was not used so that the PostgreSQL schema, indexes, constraints, and SQL queries remain explicit and easy to inspect.

The ingestion endpoint uses a database uniqueness constraint on `mention_key` rather than relying only on application-level duplicate checks. This is important because concurrent requests or pipeline retries should not be able to create duplicate mentions.

The search API uses a fixed page size of five records. This keeps the initial API simple while providing predictable pagination behavior for the current use case.

The `article_key` and `mention_key` represent two different concepts:

- `mention_key` identifies an individual source mention.
- `article_key` identifies the underlying article where it can be reliably inferred.

This allows multiple mentions of the same article to coexist without incorrectly treating them as the same source record.

---

# License

This project is licensed under the ISC License.
