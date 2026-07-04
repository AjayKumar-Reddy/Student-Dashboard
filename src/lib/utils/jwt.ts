import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "msr-insight-student-dashboard-secret-key-12345";

/**
 * Signs a JWT token containing the student USN
 */
export const signToken = (payload: { usn: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
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
