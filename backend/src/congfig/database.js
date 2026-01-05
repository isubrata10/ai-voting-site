const mongoose = require('mongoose');
const winston = require('winston');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    winston.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection events
    mongoose.connection.on('connected', () => {
      winston.info('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      winston.error(`Mongoose connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      winston.warn('Mongoose disconnected from DB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      winston.info('Mongoose connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    winston.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;