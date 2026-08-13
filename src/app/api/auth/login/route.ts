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

    // Try to find the student in Postgres
    let student = await prisma.student.findUnique({
      where: {
        usn: normalizedUSN,
      },
    });

    // If student exists in DB and no forced re-sync requested -> Verify DOB & PIN securely!
    if (student && !forceResync) {
      const storedDob = decryptField(student.dob);
      const detailsBlob = decryptJSON<any>(student.details) || {};
      const storedAuthType = decryptField(student.auth_type) || detailsBlob?.auth_type;
      const storedEncryptedPin = student.encrypted_pin || detailsBlob?.encrypted_pin;
      const storedPin = storedEncryptedPin ? decryptText(storedEncryptedPin) : null;

      // 1. Verify Date of Birth (if stored)
      if (storedDob) {
        const formattedStoredDob = formatDOB(storedDob);
        if (formattedStoredDob !== standardizedDob && storedDob !== standardizedDob) {
          return NextResponse.json(
            { success: false, message: "Invalid USN, Date of Birth, or Verification PIN." },
            { status: 401 }
          );
        }
      }

      // 2. Verify Auth Type & 4-digit PIN (if stored)
      if (storedPin) {
        if (!last4Digits || !authType) {
          return NextResponse.json(
            {
              success: false,
              requiresSecondaryAuth: true,
              message: "Verification Method and 4-digit PIN are required for sign in.",
            },
            { status: 200 }
          );
        }

        const pinMatches = String(last4Digits).trim() === String(storedPin).trim();
        const typeMatches = matchesAuthType(authType, storedAuthType);

        if (!pinMatches || !typeMatches) {
          return NextResponse.json(
            { success: false, message: "Invalid USN, Date of Birth, or Verification PIN." },
            { status: 401 }
          );
        }
      }

      // If existing student had missing PIN, but secondary auth parameters were provided, update/scrape to be safe
      if (!storedPin && (!last4Digits || !authType)) {
        return NextResponse.json(
          {
            success: false,
            requiresSecondaryAuth: true,
            message: "Verification details (PIN) required to register your credentials.",
          },
          { status: 200 }
        );
      }

      // Authenticate & Sign JWT token
      const token = signToken({ usn: normalizedUSN }, { expiresIn: tokenExpiresIn });
      return NextResponse.json({
        success: true,
        message: "Login successful",
        data: {
          usn: normalizedUSN,
          sessionId: token,
        },
      });
    }

    // If student not found in DB (or forced re-sync/missing PIN), check for secondary verification input
    if (!last4Digits || !authType) {
      console.log(`[Student Auth API] USN ${normalizedUSN} requires secondary verification parameters...`);
      return NextResponse.json(
        {
          success: false,
          requiresSecondaryAuth: true,
          message: "First-time registration requires secondary verification details (Mother/Father Mobile or ABC ID last 4 digits).",
        },
        { status: 200 }
      );
    }

    console.warn(`[Student Auth API] Student not found in database. Scraping portal with secondary credentials...`);
    try {
      await scrapeAndSyncStudent(normalizedUSN, standardizedDob, authType, last4Digits);
      student = await prisma.student.findUnique({
        where: {
          usn: normalizedUSN,
        },
      });
      if (!student) {
        throw new Error("Failed to retrieve student records from the college portal after scraping.");
      }
    } catch (scrapeErr: any) {
      console.error(`[Student Auth API] Scraping failed: ${scrapeErr.message}`);
      return NextResponse.json(
        { success: false, message: scrapeErr.message || "Invalid credentials or unable to fetch records from portal." },
        { status: 400 }
      );
    }

    // Sign the JWT token
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

