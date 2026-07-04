import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";
import studentService from "@/lib/services/studentService";
import { scrapeAndSyncStudent } from "@/lib/services/puppeteerScraper";

export async function POST(request: Request) {
  try {
    const sessionId = request.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "No session ID provided" },
        { status: 401 }
      );
    }

    const payload = verifyToken(sessionId);
    if (!payload || !payload.usn) {
      return NextResponse.json(
        { success: false, message: "Session expired or invalid" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const usn = body.usn?.toUpperCase();

    if (!usn || usn !== payload.usn) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access to USN data" },
        { status: 403 }
      );
    }

    const student = await studentService.getStudentDashboard(usn);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student record not found" },
        { status: 404 }
      );
    }

    // Cooldown check (5 minutes = 300,000ms)
    const COOLDOWN_MS = 5 * 60 * 1000;
    const detailsBlob = student.details as any;
    const lastSyncStr = detailsBlob?.last_updated;

    if (lastSyncStr) {
      const lastSync = new Date(lastSyncStr).getTime();
      const now = Date.now();
      const diff = now - lastSync;

      if (diff < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - diff;
        return NextResponse.json(
          {
            success: false,
            allowed: false,
            message: `Rate limit exceeded. Please wait ${Math.ceil(remaining / 60000)}m before updating again.`,
            nextAllowedAt: new Date(lastSync + COOLDOWN_MS).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    if (!student.dob) {
      return NextResponse.json(
        { success: false, message: "Date of Birth is missing from student records." },
        { status: 400 }
      );
    }

    console.log(`[Report Update API] Triggering manual update for ${usn}...`);
    await scrapeAndSyncStudent(usn, student.dob);
    const dashboardData = await studentService.getStudentDashboard(usn);

    return NextResponse.json({
      success: true,
      allowed: true,
      message: "Report updated",
      data: dashboardData,
    });
  } catch (error: any) {
    console.error(`[Update API Error]`, error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred while updating data." },
      { status: 500 }
    );
  }
}
