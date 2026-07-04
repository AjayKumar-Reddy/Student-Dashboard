import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/utils/jwt";
import studentService from "@/lib/services/studentService";

export async function GET(request: Request) {
  try {
    const sessionId = request.headers.get("x-session-id");
    console.log("[Profile API] Received sessionId:", sessionId ? `${sessionId.substring(0, 15)}... (len: ${sessionId.length})` : "MISSING");

    if (!sessionId || sessionId === "null" || sessionId === "undefined") {
      console.warn("[Profile API] Invalid or missing sessionId header");
      return NextResponse.json(
        { success: false, message: "No session ID provided" },
        { status: 401 }
      );
    }

    const payload = verifyToken(sessionId);
    if (!payload || !payload.usn) {
      console.warn("[Profile API] JWT verification failed for sessionId");
      return NextResponse.json(
        { success: false, message: "Session expired or invalid" },
        { status: 401 }
      );
    }

    const student = await studentService.getStudentDashboard(payload.usn);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...student,
        role: "student",
      },
    });
  } catch (error: any) {
    console.error(`[Profile API Error]`, error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
