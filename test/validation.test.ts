import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { searchQuerySchema, updateListingSchema } from '../src/validation.js';
import { toListing } from '../src/listingsRepo.js';

test('search query coerces strings and applies pagination defaults', () => {
  const q = searchQuerySchema.parse({ lat: '6.4', lng: '3.4', radiusKm: '5', minBedrooms: '2' });
  assert.deepEqual(q, { lat: 6.4, lng: 3.4, radiusKm: 5, minBedrooms: 2, page: 1, limit: 20 });
});

test('search query rejects inverted ranges and bad coordinates', () => {
  const base = { lat: 6.4, lng: 3.4, radiusKm: 5 };
  assert.equal(searchQuerySchema.safeParse({ ...base, minPrice: 10, maxPrice: 5 }).success, false);
  assert.equal(searchQuerySchema.safeParse({ ...base, minBedrooms: 4, maxBedrooms: 2 }).success, false);
  assert.equal(searchQuerySchema.safeParse({ ...base, lat: 91 }).success, false);
});

test('update schema allows partial location but not an empty body', () => {
  assert.equal(updateListingSchema.safeParse({ location: { lat: 6.5 } }).success, true);
  assert.equal(updateListingSchema.safeParse({}).success, false);
});

test('toListing flips GeoJSON [lng, lat] back to { lat, lng } and converts distance to km', () => {
  const now = new Date();
  const dto = toListing({
    _id: new Types.ObjectId(),
    title: 'x',
    price: 1,
    type: 'rent',
    bedrooms: 1,
    location: { type: 'Point', coordinates: [3.42, 6.43] },
    agentId: 'a',
    createdAt: now,
    updatedAt: now,
    distance: 6094.4,
  });
  assert.deepEqual(dto.location, { lat: 6.43, lng: 3.42 });
  assert.equal(dto.distanceKm, 6.09);
});
