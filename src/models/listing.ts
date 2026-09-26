import { Schema, model, type Types } from 'mongoose';

export const LISTING_TYPES = ['rent', 'sale', 'shortlet'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export interface GeoPoint {
  type: 'Point';
  coordinates: [lng: number, lat: number];
}

export interface ListingFields {
  title: string;
  price: number;
  type: ListingType;
  bedrooms: number;
  location: GeoPoint;
  agentId: string;
}

export type ListingRecord = ListingFields & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const pointSchema = new Schema<GeoPoint>(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const listingSchema = new Schema<ListingFields>(
  {
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    type: { type: String, enum: LISTING_TYPES, required: true },
    bedrooms: { type: Number, required: true, min: 0 },
    location: { type: pointSchema, required: true },
    agentId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

listingSchema.index({ location: '2dsphere' });

export const Listing = model<ListingFields>('Listing', listingSchema);
