const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
  // Reset captured emails between tests
  const nodemailer = require('nodemailer');
  if (nodemailer.__sentMail) nodemailer.__sentMail.length = 0;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
