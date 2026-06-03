import mongoose from 'mongoose';
import dns from 'node:dns';

function isSrvDnsError(error) {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('querysrv') &&
    (message.includes('econnrefused') || message.includes('enotfound') || message.includes('etimeout') || message.includes('servfail'))
  );
}

function applyDnsFallbackServers() {
  const fallbackFromEnv = (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const fallbackServers = fallbackFromEnv.length > 0
    ? fallbackFromEnv
    : ['8.8.8.8', '1.1.1.1'];

  dns.setServers(fallbackServers);
  return fallbackServers;
}

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️  MONGODB_URI not set. Running without database.');
      return;
    }
    const connectOptions = {
      serverSelectionTimeoutMS: 8000,
    };

    try {
      const conn = await mongoose.connect(uri, connectOptions);
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (initialError) {
      if (!uri.startsWith('mongodb+srv://') || !isSrvDnsError(initialError)) {
        throw initialError;
      }

      const fallbackServers = applyDnsFallbackServers();
      console.warn(`⚠️  MongoDB SRV lookup failed. Retrying with DNS servers: ${fallbackServers.join(', ')}`);

      const conn = await mongoose.connect(uri, connectOptions);
      console.log(`✅ MongoDB connected after DNS fallback: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Keep the API process alive so non-DB routes (health/static) still work.
    // DB-backed routes will return their own errors until connectivity recovers.
  }
};

export default connectDB;
