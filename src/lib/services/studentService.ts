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

    const detailsPayload = {
      cgpa: studentData.cgpa,
      class_details: studentData.class_details,
      last_updated: studentData.last_updated,
      subjects: studentData.subjects,
      current_semester: studentData.current_semester,
      exam_history: studentData.exam_history || [],
      placement: studentData.placement || null,
      auth_type: authType,
      encrypted_pin: encryptedPin,
    };

    const encryptedDetails = encryptJSON(detailsPayload);

    const updateData: any = {
      name: studentData.name || undefined,
      dob: studentData.dob || undefined,
      phone: studentData.phone ? encryptText(studentData.phone) : undefined,
      email: studentData.email ? encryptText(studentData.email) : undefined,
      auth_type: authType ? encryptText(authType) : undefined,
      encrypted_pin: encryptedPin,
      details: encryptedDetails,
      current_year: studentData.current_year || 0,
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

