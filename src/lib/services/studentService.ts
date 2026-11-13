import prisma from "../db";
import { encryptText, decryptText, decryptField, encryptJSON, decryptJSON } from "../utils/crypto";

export class StudentService {
  /**
   * Reads a student's full data record including the JSONB details field.
   * Decrypts all encrypted fields transparently for downstream consumers.
   * @param usn Student's University Seat Number
   */
  async getStudentDashboard(usn: string) {
    const normalizedUsn = usn.trim().toUpperCase();

    const student = await prisma.student.findUnique({
      where: { usn: normalizedUsn },
      select: {
        usn: true,
        name: true,
        dob: true,
        phone: true,
        email: true,
        current_year: true,
        auth_type: true,
        encrypted_pin: true,
        details: true,
        last_updated: true,
      }
    });

    if (!student) return null;

    const decryptedDetails = decryptJSON<Record<string, any>>(student.details);
    const studentName = decryptField(student.name);
    const studentDob = decryptField(student.dob);
    const decryptedPhone = decryptField(student.phone);
    const decryptedEmail = decryptField(student.email);
    const decryptedAuthType = decryptField(student.auth_type) || decryptedDetails?.auth_type || null;
    const encryptedPin = student.encrypted_pin || decryptedDetails?.encrypted_pin || null;

    return {
      usn: student.usn,
      name: studentName,
      dob: studentDob,
      phone: decryptedPhone,
      email: decryptedEmail,
      current_year: student.current_year,
      auth_type: decryptedAuthType,
      encrypted_pin: encryptedPin,
      details: decryptedDetails,
      last_updated: student.last_updated ? student.last_updated.toISOString() : (decryptedDetails?.last_updated || null),
    };
  }

  private buildStudentPayload(studentData: any, existingStudent: any, normalizedUsn: string) {
    const existingDetails = decryptJSON<Record<string, any>>(existingStudent?.details) || {};
    const existingAuthType = decryptField(existingStudent?.auth_type) || existingDetails.auth_type;

    const authType = studentData.auth_type || existingAuthType || null;
    let encryptedPin = existingStudent?.encrypted_pin || existingDetails.encrypted_pin || null;

    if (studentData.last4Digits || studentData.pin) {
      const plainPin = String(studentData.last4Digits || studentData.pin);
      encryptedPin = encryptText(plainPin);
    } else if (studentData.encrypted_pin) {
      encryptedPin = studentData.encrypted_pin;
    }

    // Detect if semester has transitioned (e.g. SEM 03 -> SEM 04 or completely different course codes)
    const oldSemMatch = (existingDetails.class_details || "").match(/\bSEM\s*0*(\d+)\b/i);
    const newSemMatch = (studentData.class_details || "").match(/\bSEM\s*0*(\d+)\b/i);
    const oldSem = oldSemMatch ? parseInt(oldSemMatch[1], 10) : null;
    const newSem = newSemMatch ? parseInt(newSemMatch[1], 10) : null;

    const existingCodes = new Set((existingDetails.subjects || []).map((s: any) => String(s.code || '').trim().toUpperCase()));
    const newCodes = new Set((studentData.subjects || []).map((s: any) => String(s.code || '').trim().toUpperCase()));
    const hasCodeOverlap = [...newCodes].some(code => existingCodes.has(code));

    const isSemesterTransition = Boolean(
      (oldSem && newSem && newSem !== oldSem) ||
      (existingCodes.size > 0 && newCodes.size > 0 && !hasCodeOverlap)
    );

    let timetable: any = studentData.timetable || null;
    let subjects: any[] = studentData.subjects || [];

    if (isSemesterTransition) {
      console.log(`[StudentService] Semester transition detected (${oldSem || '?'} -> ${newSem || '?'}). Resetting to new semester portal data.`);
      // In a new semester, use portal data directly (if portal timetable is empty for the new semester, do NOT show old semester timetable)
      timetable = (studentData.timetable && studentData.timetable.days && studentData.timetable.days.length > 0)
        ? studentData.timetable
        : null;
      subjects = studentData.subjects || [];
    } else {
      // Same semester: shield student against temporary scraping glitches/network timeouts
      const hasNewTimetable = Boolean(
        studentData.timetable &&
        Array.isArray(studentData.timetable.days) &&
        studentData.timetable.days.length > 0
      );
      timetable = hasNewTimetable ? studentData.timetable : (existingDetails.timetable || null);

      if (Array.isArray(existingDetails.subjects) && existingDetails.subjects.length > 0) {
        if (!Array.isArray(subjects) || subjects.length === 0) {
          subjects = existingDetails.subjects;
        } else {
          const existingMap = new Map(existingDetails.subjects.map((s: any) => [String(s.code).trim().toUpperCase(), s]));
          subjects = subjects.map((sub: any) => {
            const codeKey = String(sub.code).trim().toUpperCase();
            const oldSub = existingMap.get(codeKey) as any;
            if (!oldSub) return sub;

            const newAttMissing = !sub.attendance || (sub.attendance.classes_conducted === 0 && sub.attendance.classes_attended === 0);
            const oldAttValid = Boolean(oldSub.attendance && (oldSub.attendance.classes_conducted > 0 || oldSub.attendance.percentage > 0));

            const newCieMissing = !sub.cie || !sub.cie.tests || sub.cie.tests.length === 0;
            const oldCieValid = Boolean(oldSub.cie && oldSub.cie.tests && oldSub.cie.tests.length > 0);

            return {
              ...sub,
              attendance: (newAttMissing && oldAttValid) ? oldSub.attendance : sub.attendance,
              cie: (newCieMissing && oldCieValid) ? oldSub.cie : sub.cie,
            };
          });
        }
      }
    }

    const examHistory = (Array.isArray(studentData.exam_history) && studentData.exam_history.length > 0)
      ? studentData.exam_history
      : (existingDetails.exam_history || []);

    const hasNewPlacement = Boolean(
      studentData.placement && (
        (studentData.placement.eligibilityEvents && studentData.placement.eligibilityEvents.length > 0) ||
        (studentData.placement.inProgressEvents && studentData.placement.inProgressEvents.length > 0) ||
        (studentData.placement.completedEvents && studentData.placement.completedEvents.length > 0) ||
        studentData.placement.profile
      )
    );
    const placement = hasNewPlacement ? studentData.placement : (existingDetails.placement || null);

    const detailsPayload = {
      cgpa: studentData.cgpa || existingDetails.cgpa || "N/A",
      class_details: studentData.class_details || existingDetails.class_details || "",
      last_updated: studentData.last_updated || new Date().toISOString(),
      subjects,
      current_semester: studentData.current_semester || existingDetails.current_semester,
      exam_history: examHistory,
      placement,
      timetable,
      auth_type: authType,
      encrypted_pin: encryptedPin,
    };

    const encryptedDetails = encryptJSON(detailsPayload);
    const lastUpdatedDate = studentData.last_updated ? new Date(studentData.last_updated) : new Date();

    const updateData: any = {
      name: studentData.name || undefined,
      dob: studentData.dob || undefined,
      phone: studentData.phone ? encryptText(studentData.phone) : undefined,
      email: studentData.email ? encryptText(studentData.email) : undefined,
      auth_type: authType ? encryptText(authType) : undefined,
      encrypted_pin: encryptedPin,
      details: encryptedDetails,
      current_year: studentData.current_year || 0,
      last_updated: lastUpdatedDate,
    };

    const createData: any = {
      usn: normalizedUsn,
      name: studentData.name || "",
      dob: studentData.dob || "",
      phone: studentData.phone ? encryptText(studentData.phone) : "",
      email: studentData.email ? encryptText(studentData.email) : "",
      auth_type: authType ? encryptText(authType) : "",
      encrypted_pin: encryptedPin,
      details: encryptedDetails,
      current_year: studentData.current_year || 0,
      last_updated: lastUpdatedDate,
    };

    return { updateData, createData };
  }

  private async upsertStudentWithFallback(normalizedUsn: string, updateData: any, createData: any) {
    try {
      await prisma.student.upsert({
        where: { usn: normalizedUsn },
        update: updateData,
        create: createData,
      });
    } catch (dbErr: any) {
      if (dbErr.message?.includes("Unknown argument")) {
        console.warn(`[StudentService] Fallback for cached PrismaClient...`);
        delete updateData.auth_type;
        delete updateData.encrypted_pin;
        delete updateData.last_updated;
        delete createData.auth_type;
        delete createData.encrypted_pin;
        delete createData.last_updated;
        await prisma.student.upsert({
          where: { usn: normalizedUsn },
          update: updateData,
          create: createData,
        });
      } else {
        throw dbErr;
      }
    }
  }

  private async syncSingleStudent(usn: string, studentData: any) {
    const normalizedUsn = usn.trim().toUpperCase();
    const existingStudent = await prisma.student.findUnique({
      where: { usn: normalizedUsn },
      select: { details: true, auth_type: true, encrypted_pin: true }
    });

    const { updateData, createData } = this.buildStudentPayload(studentData, existingStudent, normalizedUsn);
    await this.upsertStudentWithFallback(normalizedUsn, updateData, createData);
    return normalizedUsn;
  }

  /**
   * Syncs student data from scraper into PostgreSQL.
   * Stores name and dob unencrypted in plain text, while encrypting other sensitive fields.
   */
  async syncStudents(studentsData: Record<string, any>) {
    const results = {
      success: [] as string[],
      errors: [] as { usn: string; error: string }[],
    };

    for (const usn in studentsData) {
      const studentData = studentsData[usn];
      try {
        const normalizedUsn = await this.syncSingleStudent(usn, studentData);
        results.success.push(normalizedUsn);
      } catch (error: any) {
        const normalizedUsn = usn.trim().toUpperCase();
        console.error(`Error syncing student ${normalizedUsn}:`, error.message);
        results.errors.push({ usn: normalizedUsn, error: error.message });
        throw error;
      }
    }

    return results;
  }

  async deleteStudent(usn: string) {
    const normalizedUsn = usn.trim().toUpperCase();
    await prisma.student.delete({
      where: { usn: normalizedUsn }
    });
  }
}

const studentService = new StudentService();
export const syncStudents = (data: Record<string, any>) => studentService.syncStudents(data);
export default studentService;

