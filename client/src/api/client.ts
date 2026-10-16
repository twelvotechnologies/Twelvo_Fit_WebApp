// Mock API Client with simulated network latency
// When switching to real backend: replace the mock implementation with real fetch / axios calls.

export const simulateNetworkDelay = async <T>(data: T, delayMs = 350): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return JSON.parse(JSON.stringify(data)); // return clone to mimic network serialization
};
