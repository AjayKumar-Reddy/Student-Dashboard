import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { formatDOB } from "@/lib/utils/dateUtils";
import { signToken } from "@/lib/utils/jwt";
import { scrapeAndSyncStudent } from "@/lib/services/puppeteerScraper";
import { decryptField, decryptText, decryptJSON } from "@/lib/utils/crypto";

function matchesAuthType(a?: string | null, b?: string | null) {
  if (!a || !b) return true;
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanA === cleanB) return true;
  if (cleanA.includes('father') && cleanB.includes('father')) return true;
  if (cleanA.includes('mother') && cleanB.includes('mother')) return true;
  if (cleanA.includes('abc') && cleanB.includes('abc')) return true;
  return false;
}

interface AuthValidationResult {
  valid: boolean;
  status: number;
  message?: string;
  requiresSecondaryAuth?: boolean;
}

function validateExistingStudent(
  student: any,
  standardizedDob: string,
  authType?: string,
  last4Digits?: string
): AuthValidationResult {
  const storedDob = decryptField(student.dob);
  const detailsBlob = decryptJSON<any>(student.details) || {};
  const storedAuthType = decryptField(student.auth_type) || detailsBlob?.auth_type;
  const storedEncryptedPin = student.encrypted_pin || detailsBlob?.encrypted_pin;
  const storedPin = storedEncryptedPin ? decryptText(storedEncryptedPin) : null;

  if (storedDob) {
    const formattedStoredDob = formatDOB(storedDob);
    if (formattedStoredDob !== standardizedDob && storedDob !== standardizedDob) {
      return { valid: false, status: 401, message: "Invalid USN, Date of Birth, or Verification PIN." };
    }
  }

  if (storedPin) {
    if (!last4Digits || !authType) {
      return {
        valid: false,
        status: 200,
        requiresSecondaryAuth: true,
        message: "Verification Method and 4-digit PIN are required for sign in."
      };
    }

    const pinMatches = String(last4Digits).trim() === String(storedPin).trim();
    const typeMatches = matchesAuthType(authType, storedAuthType);

    if (!pinMatches || !typeMatches) {
      return { valid: false, status: 401, message: "Invalid USN, Date of Birth, or Verification PIN." };
    }
  }

  if (!storedPin && (!last4Digits || !authType)) {
    return {
      valid: false,
      status: 200,
      requiresSecondaryAuth: true,
      message: "Verification details (PIN) required to register your credentials."
    };
  }

  return { valid: true, status: 200 };
}

async function handleFirstTimeSync(
  normalizedUSN: string,
  standardizedDob: string,
  authType?: string,
  last4Digits?: string
) {
  if (!last4Digits || !authType) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          requiresSecondaryAuth: true,
          message: "First-time registration requires secondary verification details (Mother/Father Mobile or ABC ID last 4 digits).",
        },
        { status: 200 }
      )
    };
  }

  try {
    await scrapeAndSyncStudent(normalizedUSN, standardizedDob, authType, last4Digits);
    const student = await prisma.student.findUnique({
      where: { usn: normalizedUSN },
    });
    if (!student) {
      throw new Error("Failed to retrieve student records from the college portal after scraping.");
    }
    return { success: true };
  } catch (scrapeErr: any) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: scrapeErr.message || "Invalid credentials or unable to fetch records from portal." },
        { status: 400 }
      )
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usn, dob, authType, last4Digits, rememberMe, forceResync } = body;

    if (!usn || !dob) {
      return NextResponse.json(
        { success: false, message: "USN and Date of Birth are required" },
        { status: 400 }
      );
    }

    const normalizedUSN = usn.trim().toUpperCase();
    const standardizedDob = formatDOB(dob);
    const tokenExpiresIn = rememberMe !== false ? "30d" : "1d";

    const student = await prisma.student.findUnique({
      where: { usn: normalizedUSN },
    });

    if (student && !forceResync) {
      const validation = validateExistingStudent(student, standardizedDob, authType, last4Digits);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: validation.message,
            requiresSecondaryAuth: validation.requiresSecondaryAuth
          },
          { status: validation.status }
        );
      }
    } else {
      const syncResult = await handleFirstTimeSync(normalizedUSN, standardizedDob, authType, last4Digits);
      if (!syncResult.success) {
        return syncResult.response!;
      }
    }

    const token = signToken({ usn: normalizedUSN }, { expiresIn: tokenExpiresIn });
    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        usn: normalizedUSN,
        sessionId: token,
      },
    });
  } catch (error: any) {
    console.error(`[Login API Error]`, error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

