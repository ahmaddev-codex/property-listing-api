import { Listing, type ListingRecord, type ListingType } from './models/listing.js';
import type { CreateListingInput, Pagination, SearchQuery, UpdateListingInput } from './validation.js';

export interface ListingDto {
  id: string;
  title: string;
  price: number;
  type: ListingType;
  bedrooms: number;
  location: { lat: number; lng: number };
  agentId: string;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export function toListing(record: ListingRecord & { distance?: number }): ListingDto {
  const [lng, lat] = record.location.coordinates;
  const dto: ListingDto = {
    id: record._id.toString(),
    title: record.title,
    price: record.price,
    type: record.type,
    bedrooms: record.bedrooms,
    location: { lat, lng },
    agentId: record.agentId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
  if (record.distance != null) {
    dto.distanceKm = Math.round(record.distance / 10) / 100; // metres -> km, 2dp
  }
  return dto;
}

function range(min?: number, max?: number) {
  if (min == null && max == null) return undefined;
  return { ...(min != null && { $gte: min }), ...(max != null && { $lte: max }) };
}

export async function createListing(input: CreateListingInput) {
  const { location, ...rest } = input;
  const doc = await Listing.create({
    ...rest,
    location: { type: 'Point', coordinates: [location.lng, location.lat] },
  });
  return toListing(doc.toObject<ListingRecord>());
}

export async function findListing(id: string) {
  const record = await Listing.findById(id).lean<ListingRecord>();
  return record ? toListing(record) : null;
}

export async function listListings({ page, limit }: Pagination): Promise<Page<ListingDto>> {
  const [records, total] = await Promise.all([
    Listing.find()
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ListingRecord[]>(),
    Listing.countDocuments(),
  ]);
  return { items: records.map(toListing), total };
}

export async function updateListing(id: string, changes: UpdateListingInput) {
  const doc = await Listing.findById(id);
  if (!doc) return null;

  const { location, ...rest } = changes;
  doc.set(rest);
  if (location) {
    const [lng, lat] = doc.location.coordinates;
    doc.set('location.coordinates', [location.lng ?? lng, location.lat ?? lat]);
  }
  await doc.save();
  return toListing(doc.toObject<ListingRecord>());
}

export async function deleteListing(id: string) {
  const { deletedCount } = await Listing.deleteOne({ _id: id });
  return deletedCount > 0;
}

export async function searchListings(query: SearchQuery): Promise<Page<ListingDto>> {
  const { lat, lng, radiusKm, type, page, limit } = query;

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  const price = range(query.minPrice, query.maxPrice);
  if (price) filter.price = price;
  const bedrooms = range(query.minBedrooms, query.maxBedrooms);
  if (bedrooms) filter.bedrooms = bedrooms;

  // $geoNear does the radius check and sorts by distance; $facet gives us
  // the page and the total count in one round trip.
  const [result] = await Listing.aggregate<{
    items: (ListingRecord & { distance: number })[];
    total: { count: number }[];
  }>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        key: 'location',
        distanceField: 'distance',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: filter,
      },
    },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return { items: result.items.map(toListing), total: result.total[0]?.count ?? 0 };
}
