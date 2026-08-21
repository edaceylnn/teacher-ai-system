from app.models.academic_year import AcademicYear
from app.models.ai_output import AIOutput, AIOutputType
from app.models.attendance import Attendance, AttendanceStatus
from app.models.audit_log import AuditLog
from app.models.classroom import Classroom
from app.models.grade import Grade
from app.models.homework import Homework, HomeworkStatus
from app.models.lesson import Lesson
from app.models.schedule import ScheduleEntry
from app.models.student import Student, StudentEnrollmentStatus
from app.models.teacher import Teacher, TeacherRole
from app.models.teacher_assignment import TeacherAssignment
from app.models.term import Term

__all__ = [
    "AcademicYear",
    "AIOutput",
    "AIOutputType",
    "Attendance",
    "AttendanceStatus",
    "AuditLog",
    "Classroom",
    "Grade",
    "Homework",
    "HomeworkStatus",
    "Lesson",
    "ScheduleEntry",
    "Student",
    "StudentEnrollmentStatus",
    "Teacher",
    "TeacherAssignment",
    "TeacherRole",
    "Term",
]
