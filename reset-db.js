require('dotenv').config();
const mongoose = require('mongoose');

const resetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    console.log('✅ Connected to MongoDB');

    // Get all collection names
    const collections = mongoose.connection.collections;
    
    console.log('🗑️  Clearing collections...');
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
      console.log(`  ✓ Cleared: ${key}`);
    }

    console.log('');
    console.log('✅ DATABASE RESET COMPLETE');
    console.log('');
    console.log('All data has been cleared:');
    console.log('  • Users');
    console.log('  • Quizzes');
    console.log('  • Scores');
    console.log('  • Enrollments');
    console.log('');
    console.log('Ready for beta testing! 🚀');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Reset Error:', error.message);
    process.exit(1);
  }
};

resetDatabase();
