/**
 * Health check endpoint to verify the service is running
 * This endpoint is unprotected and can be used for monitoring
 */
export function GET() {
  // Basic health check without external dependencies
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV || "development",
  };
  return new Response(JSON.stringify(health), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 