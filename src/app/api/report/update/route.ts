import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";
import studentService from "@/lib/services/studentService";
import { scrapeAndSyncStudent } from "@/lib/services/puppeteerScraper";
import { decryptText } from "@/lib/utils/crypto";

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
    const usn = body.usn?.trim().toUpperCase();

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

    // Cooldown check (2 minutes 30 seconds = 150,000ms)
    const COOLDOWN_MS = 150 * 1000;
    const detailsBlob = (student.details as any) || {};
    const lastSyncDate = student.last_updated || (detailsBlob?.last_updated ? new Date(detailsBlob.last_updated) : null);

    if (lastSyncDate) {
      const lastSync = new Date(lastSyncDate).getTime();
      const now = Date.now();
      const diff = now - lastSync;

      if (diff < COOLDOWN_MS && !body.bypassCooldown) {
        const remaining = COOLDOWN_MS - diff;
        const remainingSec = Math.ceil(remaining / 1000);
        const remM = Math.floor(remainingSec / 60);
        const remS = remainingSec % 60;
        const timeStr = remM > 0 ? `${remM}m ${remS}s` : `${remS}s`;

        return NextResponse.json(
          {
            success: false,
            allowed: false,
            message: `Rate limit exceeded. Please wait ${timeStr} before updating again.`,
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

    // Extract auth credentials (checking top-level model fields & JSON details)
    const authType = body.authType || (student as any).auth_type || detailsBlob?.auth_type || "Father's Mobile";
    const encryptedPin = (student as any).encrypted_pin || detailsBlob?.encrypted_pin;
    
    let last4Digits = body.last4Digits;
    if (!last4Digits && encryptedPin) {
      last4Digits = decryptText(encryptedPin);
    }

    if (!last4Digits) {
      return NextResponse.json(
        {
          success: false,
          requiresSecondaryAuth: true,
          message: "Secondary verification details (PIN) required to re-sync report from college portal."
        },
        { status: 400 }
      );
    }

    console.log(`[Report Update API] Triggering manual update for ${usn} with secondary auth...`);
    await scrapeAndSyncStudent(usn, student.dob, authType, last4Digits);
    const dashboardData = await studentService.getStudentDashboard(usn);

    return NextResponse.json({
      success: true,
      allowed: true,
      message: "Report updated",
      data: dashboardData,
    });
  } catch (error: any) {
    console.error(`[Update API Error]`, error);
    const errorMessage = error?.message || "An internal server error occurred while updating data.";
    const lowerMessage = errorMessage.toLowerCase();

    const isPortalDown =
      lowerMessage.includes("unreachable") ||
      lowerMessage.includes("refusing") ||
      lowerMessage.includes("offline") ||
      lowerMessage.includes("maintenance") ||
      lowerMessage.includes("timeout") ||
      lowerMessage.includes("timed out") ||
      lowerMessage.includes("failed to reach") ||
      lowerMessage.includes("high traffic");

    const isAuthError =
      lowerMessage.includes("invalid portal credentials") ||
      lowerMessage.includes("pin");

    const statusCode = isPortalDown ? 503 : isAuthError ? 401 : 500;

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: statusCode }
    );
  }
}
