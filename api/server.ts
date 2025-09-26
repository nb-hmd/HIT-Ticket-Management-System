/**
 * local server entry file, for local development
 */
import app from './app';
import { gracefulShutdown } from './middleware/errorHandler';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server ready on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});

// Setup graceful shutdown
gracefulShutdown(server);

export default app;




