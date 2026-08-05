import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { formatDOB } from "@/lib/utils/dateUtils";
import { signToken } from "@/lib/utils/jwt";
import { scrapeAndSyncStudent } from "@/lib/services/puppeteerScraper";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usn, dob, authType, last4Digits, forceResync } = body;

    if (!usn || !dob) {
      return NextResponse.json(
        { success: false, message: "USN and Date of Birth are required" },
        { status: 400 }
      );
    }

    const normalizedUSN = usn.toUpperCase();
    const standardizedDob = formatDOB(dob);

    // Try to find the student in Postgres
    let student = await prisma.student.findUnique({
      where: {
        usn: normalizedUSN,
      },
    });

    // If student exists in DB and no forced re-sync requested -> Instant DB Login!
    if (student && !forceResync) {
      const token = signToken({ usn: normalizedUSN });
      return NextResponse.json({
        success: true,
        message: "Login successful",
        data: {
          usn: normalizedUSN,
          sessionId: token,
        },
      });
    }

    // If student not found in DB (or forced re-sync), check for secondary verification input
    if (!last4Digits || !authType) {
      console.log(`[Student Auth API] USN ${normalizedUSN} not found in DB (or re-syncing). Requesting secondary auth parameters...`);
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
    const token = signToken({ usn: normalizedUSN });

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
