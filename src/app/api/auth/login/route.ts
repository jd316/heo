import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authService } from "../../../../services/authService";
import type { User, LoginData } from "../../../../services/authService";
import { logger } from "../../../../utils/logger";
import { z } from "zod";

// Mock user database for demo purposes
// In a real implementation, this would be replaced with a database connection
const MOCK_USERS: Record<string, User & { password: string }> = {
  "researcher@example.com": {
    id: "user-123",
    email: "researcher@example.com",
    password: "securepassword123", // In production, store hashed passwords only
    role: "researcher",
    organizationId: "org-456"
  },
  "admin@example.com": {
    id: "user-456",
    email: "admin@example.com",
    password: "adminpassword456", // In production, store hashed passwords only
    role: "admin"
  }
};

// Define login request schema for validation
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

// Define the request body type based on the schema
type _LoginRequest = z.infer<typeof loginSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const requestBody = await request.json() as unknown;
    const validationResult = loginSchema.safeParse(requestBody);

    if (!validationResult.success) {
      logger.warn(`Invalid login attempt: ${validationResult.error.message}`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials format",
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    
    // In production, retrieve user from database and verify password with bcrypt
    const user = MOCK_USERS[email];
    
    if (!user || user.password !== password) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Generate JWT token using the authenticate method
    const loginData: LoginData = {
      email,
      password
    };

    const authResult = await authService.authenticate(loginData);

    if (!authResult.success) {
      logger.error(`Failed to authenticate user ${email}: ${authResult.error}`);
      return NextResponse.json(
        {
          success: false,
          error: "Authentication error",
        },
        { status: 500 }
      );
    }

    logger.info(`Successful login for user: ${email}`);
    
    // Return token and user info
    return NextResponse.json({
      success: true,
      token: authResult.token,
      user: authResult.user
    });
  } catch (error) {
    logger.error(`Unexpected error in login API: ${error instanceof Error ? error.message : String(error)}`);
    
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
} 