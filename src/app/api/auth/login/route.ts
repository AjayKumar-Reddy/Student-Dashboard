import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { formatDOB } from "@/lib/utils/dateUtils";
import { signToken } from "@/lib/utils/jwt";
import { scrapeAndSyncStudent } from "@/lib/services/puppeteerScraper";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usn, dob } = body;

    if (!usn || !dob) {
      return NextResponse.json(
        { success: false, message: "USN and Date of Birth are required" },
        { status: 400 }
      );
    }

    const normalizedUSN = usn.toUpperCase();
    const standardizedDob = formatDOB(dob);

    // Try to find the student in Postgres
    let student = await prisma.student.findFirst({
      where: {
        usn: normalizedUSN,
        dob: standardizedDob,
      },
    });

    // If student not found in DB, scrape from portal
    if (!student) {
      console.warn(`[Student Auth API] Student not found in database. Scraping portal...`);
      try {
        await scrapeAndSyncStudent(normalizedUSN, standardizedDob);
        student = await prisma.student.findFirst({
          where: {
            usn: normalizedUSN,
            dob: standardizedDob,
          },
        });
        if (!student) {
          throw new Error("Failed to retrieve student records from the college portal after scraping.");
        }
      } catch (scrapeErr: any) {
        console.error(`[Student Auth API] Scraping failed: ${scrapeErr.message}`);
        return NextResponse.json(
          { success: false, message: "Invalid credentials or unable to fetch records from portal." },
          { status: 401 }
        );
      }
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
