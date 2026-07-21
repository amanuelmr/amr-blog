module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 60000,
  // Silence app logging noise during tests
  silent: true,
};
