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
  return role.toLowerCase().replace(/[\s\-_]/g, '');
};

export const isRole = (currentRole, targetRole) => {
  return normalizeRole(currentRole) === normalizeRole(targetRole);
};

export const NO_DEPT_ROLES = [
  'admin',
  'principal',
  'manager',
  'viceprincipal',
  'collegecouncil',
  'driver',
  'transportincharge',
  'juniorsuperintendent',
  'ao',
  'cfo',
  'hrsection',
  'hr',
  'accountssection',
  'accounts',
  'account',
  'acct',
  'acctsection',
  'maintenancesection'
];

export const isNoDeptRole = (role) => {
  if (!role) return false;
  const norm = normalizeRole(role);
  if (norm.includes('account') || norm.includes('acct')) return true;
  return NO_DEPT_ROLES.some(r => norm === r);
};

