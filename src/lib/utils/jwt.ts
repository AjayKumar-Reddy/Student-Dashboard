import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "msr-insight-student-dashboard-secret-key-12345";

/**
 * Signs a JWT token containing the student USN with configurable expiration.
 */
export const signToken = (payload: { usn: string }, options?: { expiresIn?: string }) => {
  const expiresIn = options?.expiresIn || "30d";
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): { usn: string } | null => {
  try {
    const verified = jwt.verify(token, JWT_SECRET) as { usn: string };
    console.log("[JWT] Verification successful for USN:", verified.usn);
    return verified;
  } catch (error: any) {
    console.error("[JWT] Verification failed. Error:", error.message, "Token:", token);
    return null;
  }
};
