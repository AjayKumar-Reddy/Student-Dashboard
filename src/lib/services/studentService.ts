import prisma from "../db";

export class StudentService {
  /**
   * Reads a student's full data record including the JSONB details field.
   * Standardizes the returned structure for the frontend dashboard.
   * @param usn Student's University Seat Number
   */
  async getStudentDashboard(usn: string) {
    const normalizedUsn = usn.toUpperCase();

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
      const normalizedUsn = usn.toUpperCase();

      try {
        const detailsPayload = {
          cgpa: studentData.cgpa,
          class_details: studentData.class_details,
          last_updated: studentData.last_updated,
          subjects: studentData.subjects,
          exam_history: studentData.exam_history || [],
          placement: studentData.placement || null,
        };

        await prisma.student.upsert({
          where: { usn: normalizedUsn },
          update: {
            name: studentData.name,
            dob: studentData.dob,
            details: detailsPayload,
            current_year: studentData.current_year || 0,
          },
          create: {
            usn: normalizedUsn,
            name: studentData.name,
            dob: studentData.dob,
            details: detailsPayload,
            current_year: studentData.current_year || 0,
          },
        });
        results.success.push(normalizedUsn);
      } catch (error: any) {
        console.error(`Error syncing student ${normalizedUsn}:`, error.message);
        results.errors.push({ usn: normalizedUsn, error: error.message });
      }
    }

    return results;
  }

  async deleteStudent(usn: string) {
    const normalizedUsn = usn.toUpperCase();
    await prisma.student.delete({
      where: { usn: normalizedUsn }
    });
  }
}

const studentService = new StudentService();
export const syncStudents = (data: Record<string, any>) => studentService.syncStudents(data);
export default studentService;
// Force re-build cache update
