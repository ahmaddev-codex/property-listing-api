import { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb } from '../src/db.js';
import { Listing } from '../src/models/listing.js';

// Spins up a throwaway mongod for the test file that imports this.
export function useTestDb() {
  let mongo: MongoMemoryServer;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  beforeEach(async () => {
    await Listing.deleteMany({});
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
}
