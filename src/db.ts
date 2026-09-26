import mongoose from 'mongoose';
import { Listing } from './models/listing.js';

export async function connectDb(uri: string) {
  await mongoose.connect(uri);
  // make sure the 2dsphere index exists before any $geoNear query runs
  await Listing.init();
}
