export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  HOD: 'hod',
  STUDENT: 'student',
  FACULTY: 'faculty',
  FACULTY_ADVISOR: 'facultyadvisor',
  MANAGER: 'manager',
};

export const normalizeRole = (role) => {
  if (typeof role !== 'string') return '';
  return role.toLowerCase().replace(/\s/g, '');
};

export const isRole = (currentRole, targetRole) => {
  return normalizeRole(currentRole) === normalizeRole(targetRole);
};
