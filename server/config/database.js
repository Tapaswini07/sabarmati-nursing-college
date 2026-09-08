import dns from "node:dns";
import mongoose from "mongoose";

const DEFAULT_DB_NAME = "edufirmNoval";
const FALLBACK_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const CONNECTION_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function withDatabaseName(uri, databaseName = DEFAULT_DB_NAME) {
  if (!uri) {
    return "";
  }

  const parsed = new URL(uri);
  const currentDatabase = parsed.pathname.replace(/^\//, "");

  if (!currentDatabase) {
    parsed.pathname = `/${databaseName}`;
  }

  return parsed.toString();
}

function getConnectionDetails(uri) {
  const parsed = new URL(uri);
  return {
    host: parsed.host,
    database: parsed.pathname.replace(/^\//, "") || DEFAULT_DB_NAME,
  };
}

function shouldRetryWithFallbackDns(uri, error) {
  return (
    uri.startsWith("mongodb+srv://") &&
    ["ECONNREFUSED", "ETIMEOUT", "ENOTFOUND", "ESERVFAIL"].includes(error?.code)
  );
}

function getFallbackDnsServers() {
  return (process.env.MONGO_DNS_SERVERS || FALLBACK_DNS_SERVERS.join(","))
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
}

function configureAtlasDns(uri) {
  if (!uri.startsWith("mongodb+srv://") || process.env.MONGO_DNS_SERVERS === "system") {
    return [];
  }

  const fallbackServers = getFallbackDnsServers();
  if (fallbackServers.length > 0) {
    dns.setServers(fallbackServers);
  }

  return fallbackServers;
}

async function connectWithFallbackDns(uri, options) {
  const configuredServers = configureAtlasDns(uri);

  if (configuredServers.length > 0) {
    console.log(`MongoDB Atlas DNS servers: ${configuredServers.join(", ")}`);
  }

  try {
    return await mongoose.connect(uri, options);
  } catch (error) {
    if (!shouldRetryWithFallbackDns(uri, error) || configuredServers.length > 0) {
      throw error;
    }

    const fallbackServers = getFallbackDnsServers();

    dns.setServers(fallbackServers);
    console.warn(
      `MongoDB SRV DNS lookup failed (${error.code}). Retrying with DNS servers: ${fallbackServers.join(", ")}`
    );

    return mongoose.connect(uri, options);
  }
}

export function getMongoUri() {
  const rawUri = process.env.MONGO_URI;

  if (!rawUri) {
    throw new Error("MONGO_URI is required. Set it to your MongoDB Atlas connection string.");
  }

  return withDatabaseName(rawUri, process.env.MONGO_DB_NAME || DEFAULT_DB_NAME);
}

export async function connectDatabase() {
  const uri = getMongoUri();
  const details = getConnectionDetails(uri);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await connectWithFallbackDns(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 20000,
  });
  console.log(`MongoDB connected: ${details.host}/${details.database}`);

  return mongoose.connection;
}

export function getDatabaseStatus() {
  const uri = getMongoUri();
  const details = getConnectionDetails(uri);
  const connection = mongoose.connection;

  return {
    state: CONNECTION_STATES[connection.readyState] || "unknown",
    host: connection.host || details.host,
    database: connection.name || details.database,
  };
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export function requireDatabaseConnection(req, res, next) {
  if (isDatabaseConnected()) {
    return next();
  }

  return res.status(503).json({
    message: "MongoDB is not connected. Please check MONGO_URI and restart the server.",
    mongodb: getDatabaseStatus(),
  });
}
