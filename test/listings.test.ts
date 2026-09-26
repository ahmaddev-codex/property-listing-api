import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { useTestDb } from './setup.js';

useTestDb();
const app = createApp();

// A few spots around Lagos, plus one in Abuja
const places = {
  vi: { lat: 6.4281, lng: 3.4219 },
  lekki: { lat: 6.4474, lng: 3.4723 },
  ikeja: { lat: 6.6018, lng: 3.3515 },
  abuja: { lat: 9.0765, lng: 7.3986 },
};

const listing = (overrides: Record<string, unknown> = {}) => ({
  title: '2 bed flat',
  price: 2500000,
  type: 'rent',
  bedrooms: 2,
  location: places.vi,
  agentId: 'agent-1',
  ...overrides,
});

async function seed(...items: Record<string, unknown>[]) {
  const created = [];
  for (const item of items) {
    const res = await request(app).post('/listings').send(listing(item));
    assert.equal(res.status, 201);
    created.push(res.body.data);
  }
  return created;
}

const titles = (res: request.Response) => res.body.data.map((l: { title: string }) => l.title);

test('creates and fetches a listing', async () => {
  const res = await request(app).post('/listings').send(listing());
  assert.equal(res.status, 201);
  assert.equal(res.body.data.title, '2 bed flat');
  assert.deepEqual(res.body.data.location, places.vi);

  const get = await request(app).get(`/listings/${res.body.data.id}`);
  assert.equal(get.status, 200);
  assert.deepEqual(get.body.data, res.body.data);
});

test('rejects invalid listings with field level errors', async () => {
  const res = await request(app)
    .post('/listings')
    .send(listing({ price: -5, type: 'lease', location: { lat: 200, lng: 3 } }));

  assert.equal(res.status, 400);
  const fields = res.body.error.details.map((d: { field: string }) => d.field);
  assert.ok(fields.includes('price'));
  assert.ok(fields.includes('type'));
  assert.ok(fields.includes('location.lat'));
});

test('rejects unknown fields and malformed json', async () => {
  const extra = await request(app).post('/listings').send(listing({ foo: 'bar' }));
  assert.equal(extra.status, 400);

  const bad = await request(app)
    .post('/listings')
    .set('Content-Type', 'application/json')
    .send('{"title": ');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.message, 'Malformed JSON body');
});

test('returns 404 for missing listings and 400 for bad ids', async () => {
  const missing = new Types.ObjectId().toString();
  assert.equal((await request(app).get(`/listings/${missing}`)).status, 404);
  assert.equal((await request(app).delete(`/listings/${missing}`)).status, 404);
  assert.equal((await request(app).get('/listings/abc')).status, 400);
});

test('updates part of a listing', async () => {
  const [created] = await seed({});
  const res = await request(app)
    .patch(`/listings/${created.id}`)
    .send({ price: 3000000, location: { lat: 6.45 } });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.price, 3000000);
  assert.equal(res.body.data.title, created.title);
  assert.deepEqual(res.body.data.location, { lat: 6.45, lng: places.vi.lng });
});

test('deletes a listing', async () => {
  const [created] = await seed({});
  assert.equal((await request(app).delete(`/listings/${created.id}`)).status, 204);
  assert.equal((await request(app).get(`/listings/${created.id}`)).status, 404);
});

test('paginates the listing index', async () => {
  await seed({}, {}, {}, {}, {});
  const res = await request(app).get('/listings?page=2&limit=2');

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 });

  assert.equal((await request(app).get('/listings?limit=1000')).status, 400);
});

test('search only returns listings inside the radius, closest first', async () => {
  await seed(
    { title: 'Ikeja', location: places.ikeja },
    { title: 'Lekki', location: places.lekki },
    { title: 'Abuja', location: places.abuja },
    { title: 'VI', location: places.vi },
  );

  const res = await request(app)
    .get('/listings/search')
    .query({ ...places.vi, radiusKm: 10 });

  assert.equal(res.status, 200);
  assert.deepEqual(titles(res), ['VI', 'Lekki']);
  assert.equal(res.body.data[0].distanceKm, 0);
  assert.equal(res.body.pagination.total, 2);
});

test('search filters by type, price and bedrooms', async () => {
  await seed(
    { title: 'cheap rent', type: 'rent', price: 1000000, bedrooms: 1 },
    { title: 'big rent', type: 'rent', price: 5000000, bedrooms: 4 },
    { title: 'sale', type: 'sale', price: 90000000, bedrooms: 3 },
    { title: 'shortlet', type: 'shortlet', price: 80000, bedrooms: 2 },
  );
  const base = { ...places.vi, radiusKm: 5 };

  const rent = await request(app).get('/listings/search').query({ ...base, type: 'rent' });
  assert.deepEqual(titles(rent).sort(), ['big rent', 'cheap rent']);

  const priced = await request(app)
    .get('/listings/search')
    .query({ ...base, minPrice: 50000, maxPrice: 2000000 });
  assert.deepEqual(titles(priced).sort(), ['cheap rent', 'shortlet']);

  const beds = await request(app).get('/listings/search').query({ ...base, minBedrooms: 3 });
  assert.deepEqual(titles(beds).sort(), ['big rent', 'sale']);
});

test('search paginates results', async () => {
  await seed({}, {}, {});
  const res = await request(app)
    .get('/listings/search')
    .query({ ...places.vi, radiusKm: 5, limit: 2, page: 2 });

  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 2, total: 3, totalPages: 2 });
});

test('search requires a point and radius', async () => {
  const res = await request(app).get('/listings/search').query({ lat: 6.4 });
  assert.equal(res.status, 400);
});
