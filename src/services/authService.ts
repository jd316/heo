import { SignJWT, jwtVerify } from "jose";
import { browserLogger as logger } from "../utils/browserLogger";

// Interface for JWT payload
interface JWTPayloadInput {
  sub: string;
  email: string;
  role: string;
  org?: string;
  [key: string]: string | number | undefined;
}

// JWT payload returned after verification
interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  org?: string;
  iat: number;
  exp: number;
  [key: string]: string | number | undefined;
}

// User model
export interface User {
  id: string;
  email: string;
  role: "researcher" | "admin" | "validator";
  organizationId?: string;
}

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Login request data
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Service for authentication operations
 */
class AuthService {
  private secretKey: Uint8Array;

  constructor() {
    // Get JWT secret from environment variable
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable not set");
    }

    // Convert string to Uint8Array for Jose
    this.secretKey = new TextEncoder().encode(jwtSecret);
  }

  /**
   * Authenticate a user with email and password
   */
  async authenticate(loginData: LoginData): Promise<AuthResult> {
    try {
      // Mock authentication for demonstration
      // In production, this would validate against a database
      if (loginData.email === "demo@example.com" && loginData.password === "password") {
        const user: User = {
          id: "usr_123456789",
          email: loginData.email,
          role: "researcher",
        };

        // Generate JWT token
        const token = await this.generateToken(user);

        return {
          success: true,
          user,
          token,
        };
      }

      return {
        success: false,
        error: "Invalid email or password",
      };
    } catch (error) {
      logger.error("Error in authentication:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate a JWT token for a user
   */
  async generateToken(user: User): Promise<string> {
    try {
      // Get JWT expiry from environment variable or use default (24 hours)
      const jwtExpiry = process.env.JWT_EXPIRY
        ? parseInt(process.env.JWT_EXPIRY)
        : 86400;

      // Create payload
      const payload: JWTPayloadInput = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      if (user.organizationId) {
        payload.org = user.organizationId;
      }

      // Generate token with Jose
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + jwtExpiry)
        .sign(this.secretKey);

      return token;
    } catch (error) {
      logger.error("Error generating token:", error);
      throw error;
    }
  }

  /**
   * Verify a JWT token and return the user information
   */
  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // Use generic parameter to properly type the payload
      const { payload } = await jwtVerify<JWTPayload>(token, this.secretKey);
      
      // Check token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        return {
          success: false,
          error: "Token has expired",
        };
      }

      const user: User = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as "researcher" | "admin" | "validator",
        organizationId: payload.org,
      };

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error("Error verifying token:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 