// .env file se environment variables load karo
require('dotenv').config();

const app = require('./src/app');
const { connectDatabase, closeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('');
    console.log('🐄 ============================================');
    console.log('🐄 Starting Cow Rescue Backend...');
    console.log('🐄 ============================================');
    console.log('');

    // Database connect karo
    await connectDatabase();

    // Server start karo
    const server = app.listen(PORT, () => {
      console.log('🐄 ============================================');
      console.log('🚀 Cow Rescue Backend is running!');
      console.log(`🌐 URL:          http://localhost:${PORT}`);
      console.log(`📋 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔧 Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log('🐄 ============================================');
      console.log('');
    });

    // ==== GRACEFUL SHUTDOWN ====
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server gracefully...');
      await closeDatabase();
      server.close(() => {
        console.log('✅ Server closed. Goodbye!');
        process.exit(0);
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 SIGTERM received. Shutting down...');
      await closeDatabase();
      server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('');
    console.error('❌ ============================================');
    console.error('❌ Failed to start server!');
    console.error('❌ ============================================');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

startServer();