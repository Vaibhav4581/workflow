const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  HOD: 'hod',
  STUDENT: 'student',
  FACULTY: 'faculty',
  FACULTY_ADVISOR: 'facultyadvisor',
  MANAGER: 'manager',
};

const normalizeRole = (role) => {
  if (typeof role !== 'string') return '';
  return role.toLowerCase().replace(/\s/g, '');
};

const isRole = (currentRole, targetRole) => {
  return normalizeRole(currentRole) === normalizeRole(targetRole);
};

// Generates an array of common string permutations for database $in queries
const getRoleQueryArray = (role) => {
  const norm = normalizeRole(role);
  if (norm === ROLES.HOD) return ['HOD', 'hod', 'Hod'];
  if (norm === ROLES.PRINCIPAL) return ['Principal', 'principal'];
  if (norm === ROLES.FACULTY_ADVISOR) return ['FacultyAdvisor', 'facultyadvisor', 'Faculty Advisor', 'Faculty', 'faculty'];
  if (norm === ROLES.MANAGER) return ['Manager', 'manager'];
  // Default fallback
  return [role, norm];
};

module.exports = {
  ROLES,
  normalizeRole,
  isRole,
  getRoleQueryArray
};
