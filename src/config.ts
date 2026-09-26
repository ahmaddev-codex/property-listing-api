try {
  process.loadEnvFile();
} catch {
  // no .env file, fall back to real env vars / defaults
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/property_listings',
};
