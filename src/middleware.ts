import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authService } from './services/authService';
import { browserLogger } from './utils/browserLogger';

// Paths that should be protected
const protectedPaths = [
  '/api/dkg/publish',
  '/api/dkg/query',
];

// Function to check if a path should be protected
const isProtectedPath = (path: string): boolean => {
  return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip middleware for non-protected paths
  if (!isProtectedPath(path)) {
    return NextResponse.next();
  }

  // Get the token from the Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    browserLogger.warn(`Unauthorized access attempt to ${path}`);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify the token
    const verifyResult = await authService.verifyToken(token);
    
    if (!verifyResult.success) {
      browserLogger.warn(`Invalid token used to access ${path}: ${verifyResult.error}`);
      return new NextResponse(
        JSON.stringify({ success: false, error: verifyResult.error }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    // Add user info to the request headers for route handlers to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', verifyResult.user?.id || '');
    requestHeaders.set('x-user-email', verifyResult.user?.email || '');
    requestHeaders.set('x-user-role', verifyResult.user?.role || '');
    
    if (verifyResult.user?.organizationId) {
      requestHeaders.set('x-user-org', verifyResult.user.organizationId);
    }

    browserLogger.info(`Authenticated request to ${path} for user ${verifyResult.user?.email}`);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    browserLogger.error(`Error during authentication middleware: ${error instanceof Error ? error.message : String(error)}`);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Authentication error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

// Configure which paths this middleware should run on
export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 