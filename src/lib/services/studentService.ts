import prisma from "../db";
import { encryptText } from "../utils/crypto";

export class StudentService {
  /**
   * Reads a student's full data record including the JSONB details field.
   * Standardizes the returned structure for the frontend dashboard.
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
        details: true, // The JSONB blob containing subjects, attendance, etc.
      }
    });

    return student;
  }

  /**
   * Syncs student data from scraper as a single JSON blob into the Student details field.
   * This handles the UPSERT logic directly into PostgreSQL.
   */
  async syncStudents(studentsData: Record<string, any>) {
    const results = {
      success: [] as string[],
      errors: [] as { usn: string; error: string }[],
    };

    for (const usn in studentsData) {
      const studentData = studentsData[usn];
      const normalizedUsn = usn.trim().toUpperCase();

      try {
        // Fetch existing details to preserve credentials if not passed in current sync
        const existingStudent = await prisma.student.findUnique({
          where: { usn: normalizedUsn },
          select: { details: true }
        });
        const existingDetails = (existingStudent?.details as Record<string, any>) || {};

        let authType = studentData.auth_type || existingDetails.auth_type || null;
        let encryptedPin = existingDetails.encrypted_pin || null;

        if (studentData.last4Digits || studentData.pin) {
          const plainPin = String(studentData.last4Digits || studentData.pin);
          encryptedPin = encryptText(plainPin);
        } else if (studentData.encrypted_pin) {
          encryptedPin = studentData.encrypted_pin;
        }

        const detailsPayload = {
          cgpa: studentData.cgpa,
          class_details: studentData.class_details,
          last_updated: studentData.last_updated,
          subjects: studentData.subjects,
          exam_history: studentData.exam_history || [],
          placement: studentData.placement || null,
          auth_type: authType,
          encrypted_pin: encryptedPin,
        };

        const updateData: any = {
          name: studentData.name,
          dob: studentData.dob,
          auth_type: authType,
          encrypted_pin: encryptedPin,
          details: detailsPayload,
          current_year: studentData.current_year || 0,
        };

        const createData: any = {
          usn: normalizedUsn,
          name: studentData.name,
          dob: studentData.dob,
          auth_type: authType,
          encrypted_pin: encryptedPin,
          details: detailsPayload,
          current_year: studentData.current_year || 0,
        };

        try {
          await prisma.student.upsert({
            where: { usn: normalizedUsn },
            update: updateData,
            create: createData,
          });
        } catch (dbErr: any) {
          if (dbErr.message?.includes('Unknown argument')) {
            console.warn(`[StudentService] Fallback for cached PrismaClient (saving auth_type/encrypted_pin inside details JSON)...`);
            delete updateData.auth_type;
            delete updateData.encrypted_pin;
            delete createData.auth_type;
            delete createData.encrypted_pin;
            await prisma.student.upsert({
              where: { usn: normalizedUsn },
              update: updateData,
              create: createData,
            });
          } else {
            throw dbErr;
          }
        }

        results.success.push(normalizedUsn);
      } catch (error: any) {
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
// Force re-build cache update
