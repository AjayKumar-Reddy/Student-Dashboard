import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";
import studentService from "@/lib/services/studentService";

export async function DELETE(request: Request) {
  try {
    const sessionId = request.headers.get("x-session-id");
    console.log("[Delete API] Received request for sessionId verification");

    if (!sessionId || sessionId === "null" || sessionId === "undefined") {
      console.warn("[Delete API] Invalid or missing sessionId header");
      return NextResponse.json(
        { success: false, message: "No session ID provided" },
        { status: 401 }
      );
    }

    const payload = verifyToken(sessionId);
    if (!payload || !payload.usn) {
      console.warn("[Delete API] JWT verification failed");
      return NextResponse.json(
        { success: false, message: "Session expired or invalid" },
        { status: 401 }
      );
    }

    console.log(`[Delete API] Authenticated USN: ${payload.usn}. Proceeding with secure deletion.`);

    // Securely delete the student record associated with the authenticated USN
    await studentService.deleteStudent(payload.usn);

    console.log(`[Delete API] Successfully deleted student database record for USN: ${payload.usn}`);

    return NextResponse.json({
      success: true,
      message: "Student profile data has been deleted permanently."
    });
  } catch (error: any) {
    console.error(`[Delete API Error]`, error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
