# Property Listings API

Small REST API for property listings (rent / sale / shortlet) with a radius search.

TypeScript, Express, MongoDB with Mongoose, and zod for validation.

## Setup

Needs Node 20.12+ and a running MongoDB (a local install or `docker run -p 27017:27017 mongo` both work).

```
npm install
npm run seed             # wipes listings and loads ~20 sample ones (Lagos + Abuja)
npm run dev              # tsx watch, runs on :3000
npm run build && npm start
npm test
```

Config is `PORT` and `MONGODB_URI`. Copy `.env.example` to `.env` to change them. If there's no `.env`, the defaults in the example file are used.

The tests don't need MongoDB installed because they use mongodb-memory-server. The first run downloads a mongod binary (~75MB), so it's slow that one time.

## Endpoints

| Method | Path               | What it does                            |
| ------ | ------------------ | --------------------------------------- |
| GET    | `/health`          | Health check                            |
| GET    | `/listings`        | List all listings, newest first         |
| GET    | `/listings/search` | Search by location and filters          |
| GET    | `/listings/:id`    | Get one listing                         |
| POST   | `/listings`        | Create a listing                        |
| PATCH  | `/listings/:id`    | Update some fields of a listing         |
| DELETE | `/listings/:id`    | Delete a listing                        |

`GET /listings` and `GET /listings/search` both take `page` (default 1) and `limit` (default 20, max 100).

Search parameters:

| Param                         | Required | Notes                        |
| ----------------------------- | -------- | ---------------------------- |
| `lat`, `lng`                  | yes      | centre point                 |
| `radiusKm`                    | yes      | up to 500                    |
| `type`                        | no       | `rent`, `sale` or `shortlet` |
| `minPrice`, `maxPrice`        | no       |                              |
| `minBedrooms`, `maxBedrooms`  | no       |                              |

For example, rentals with at least 2 bedrooms within 10km of Victoria Island:

```
GET /listings/search?lat=6.4281&lng=3.4219&radiusKm=10&type=rent&minBedrooms=2
```

Example body for POST (PATCH takes any subset of these):

```json
{
  "title": "3 bed duplex, Lekki",
  "price": 4500000,
  "type": "rent",
  "bedrooms": 3,
  "location": { "lat": 6.4474, "lng": 3.4723 },
  "agentId": "agent-12"
}
```

Search results are sorted by distance and each one has a `distanceKm` field. List responses look like `{ data, pagination: { page, limit, total, totalPages } }`. Errors look like `{ error: { message, details? } }`: 400 for bad input or malformed JSON, 404 for a missing listing.

## Notes on the approach

- I picked Mongo mostly for the geo support because it has most of the geo logic built in. Location is stored as a GeoJSON point with a `2dsphere` index. Search is one aggregation: `$geoNear` does the radius check, applies the other filters and sorts by distance, then a `$facet` returns the page and the total count together. The API itself takes and returns `{ lat, lng }`. The GeoJSON `[lng, lat]` order only exists in the database layer.
- Request validation uses zod at the route level, which also gives the TS types for inputs. The Mongoose schema has its own basic constraints as a second line of defence.
- PATCH is a partial update, including partial location. Unknown fields get rejected instead of being silently ignored.
- `agentId` is just a string for now because there's no agents collection yet.
- Price is a plain number with no currency attached.

## With more time

- Auth, so that only the owning agent can edit or delete a listing. This is something that i would definitely like to see.
- Add a currency field, and store prices in minor units.
- Cursor-based pagination. Skip/limit gets slow on deep pages.
- OpenAPI spec, request logging, rate limiting, Dockerfile + compose file with Mongo. This is important for scaling and will make the app more production ready.
- Compound indexes once real query patterns are known (e.g. type + price).
