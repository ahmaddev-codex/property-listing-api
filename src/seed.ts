import mongoose from 'mongoose';
import { config } from './config.js';
import { connectDb } from './db.js';
import { Listing, type ListingFields, type ListingType } from './models/listing.js';

// [title, type, price, bedrooms, lat, lng, agentId]
const rows: [string, ListingType, number, number, number, number, string][] = [
  ['3 bed flat, Admiralty Way', 'rent', 6500000, 3, 6.4474, 3.4723, 'agent-1'],
  ['4 bed semi-detached duplex, Chevron', 'sale', 185000000, 4, 6.4404, 3.5316, 'agent-1'],
  ['Studio apartment, Ikate', 'shortlet', 45000, 0, 6.4412, 3.4905, 'agent-2'],
  ['2 bed serviced flat, Oniru', 'shortlet', 120000, 2, 6.4338, 3.4516, 'agent-2'],
  ['Mini flat, Ajah', 'rent', 1200000, 1, 6.4698, 3.5852, 'agent-3'],
  ['5 bed detached house, Banana Island', 'sale', 950000000, 5, 6.4546, 3.4441, 'agent-4'],
  ['3 bed penthouse, Victoria Island', 'shortlet', 250000, 3, 6.4281, 3.4219, 'agent-4'],
  ['2 bed flat, Adeniyi Jones', 'rent', 3000000, 2, 6.6018, 3.3515, 'agent-5'],
  ['4 bed terrace, GRA Ikeja', 'sale', 120000000, 4, 6.5833, 3.3553, 'agent-5'],
  ['Self contain, Yaba', 'rent', 700000, 1, 6.5095, 3.3711, 'agent-3'],
  ['3 bed flat, Surulere', 'rent', 2500000, 3, 6.5009, 3.3581, 'agent-6'],
  ['2 bed apartment, Gbagada Phase 2', 'rent', 2800000, 2, 6.5530, 3.3891, 'agent-6'],
  ['4 bed duplex, Magodo', 'sale', 150000000, 4, 6.6194, 3.3920, 'agent-7'],
  ['1 bed apartment, Ikoyi', 'shortlet', 95000, 1, 6.4520, 3.4350, 'agent-4'],
  ['Land with C of O, Sangotedo', 'sale', 35000000, 0, 6.4750, 3.6300, 'agent-7'],
  ['3 bed flat, Wuse 2', 'rent', 5500000, 3, 9.0765, 7.4786, 'agent-8'],
  ['5 bed mansion, Maitama', 'sale', 750000000, 5, 9.0882, 7.4934, 'agent-8'],
  ['2 bed serviced apartment, Jabi', 'shortlet', 85000, 2, 9.0643, 7.4230, 'agent-9'],
  ['4 bed terrace, Gwarinpa', 'sale', 95000000, 4, 9.1030, 7.4032, 'agent-9'],
  ['Mini flat, Kubwa', 'rent', 900000, 1, 9.1550, 7.3222, 'agent-10'],
];

const listings: ListingFields[] = rows.map(([title, type, price, bedrooms, lat, lng, agentId]) => ({
  title,
  type,
  price,
  bedrooms,
  location: { type: 'Point', coordinates: [lng, lat] },
  agentId,
}));

await connectDb(config.mongoUri);
await Listing.deleteMany({});
await Listing.insertMany(listings);
console.log(`Seeded ${listings.length} listings`);
await mongoose.disconnect();
