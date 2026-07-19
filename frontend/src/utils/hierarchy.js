export const DOCUMENT_TYPES = [
  'Type:1.SubmissionofAcademicMatters/Co-curricularandExtracurricular activities (with Financial Impact)',
  'Type:2.SubmissionofAcademicMatters/Co-curricularandExtracurricular activities(without Financial Impact)',
  'Type:3.AdministrativeMatters(withFinancialImpact)',
  'Type:4.PureFinanceMatters',
  'Type:4.VehicleRelated',
  'Type:6.Appointment/ProbationRelated',
  'Type:7.DisciplinaryActionsagainststudents',
  'Type:8a.Maintenance&Repair(Major)',
  'Type:8b.Maintenance&Repair(Minor)',
  'Type:9.FacilityAllocation'
];

export const DOCUMENT_HIERARCHIES = {
  '1': ['HOD', 'Principal', 'JuniorSuperintendent', 'CFO', 'Manager'],
  '2': ['HOD', 'Principal', 'Manager'],
  '3': ['AO', 'Principal', 'CFO', 'Manager'],
  '4': ['CFO', 'Manager'], 
  '4a': ['TransportinCharge', 'JuniorSuperintendent', 'AO', 'Manager'], 
  '6': ['AO', 'Principal', 'Manager'],
  '7': ['HOD', 'VicePrincipal', 'Principal', 'CollegeCouncil'],
  '8a': ['HOD', 'JuniorSuperintendent', 'AO', 'Principal', 'CFO', 'Manager'],
  '8b': ['HOD', 'JuniorSuperintendent', 'MaintenanceSection'],
  '9': ['HOD', 'Principal', 'AO']
};

export const DOCUMENT_ORIGINATORS = {
  '1': ['faculty', 'facultyadvisor'],
  '2': ['faculty', 'facultyadvisor'],
  '3': ['juniorsuperintendent'],
  '4': ['accountssection'],
  '4a': ['driver'],
  '6': ['hrsection'],
  '7': ['facultyadvisor'],
  '8a': ['faculty', 'staff', 'facultyadvisor'],
  '8b': ['faculty', 'staff', 'facultyadvisor'],
  '9': ['faculty', 'staff', 'facultyadvisor']
};

export const getDocumentTypeKey = (category) => {
  if (!category) return null;
  const match = category.match(/Type:(\d+[a-zA-Z]*)\./);
  let typeKey = match ? match[1] : null;

  if (category.includes('PureFinance')) typeKey = '4';
  if (category.includes('VehicleRelated')) typeKey = '4a';

  return typeKey;
};

export const getNextReceiver = (category, currentToHistory = []) => {
  const typeKey = getDocumentTypeKey(category);

  if (!typeKey || !DOCUMENT_HIERARCHIES[typeKey]) return null;

  const hierarchy = DOCUMENT_HIERARCHIES[typeKey];
  
  if (!currentToHistory || currentToHistory.length === 0) {
    return hierarchy[0];
  }

  // Find the last receiver in the chain
  const lastReceiver = currentToHistory[currentToHistory.length - 1];
  
  // Find where this receiver is in the hierarchy
  // Using lower-case comparison to be safe
  const currentIndex = hierarchy.findIndex(
    role => role.toLowerCase() === lastReceiver.toLowerCase()
  );

  if (currentIndex === -1) {
    // Current receiver not found in hierarchy, just return the first one as fallback
    return hierarchy[0];
  }

  if (currentIndex + 1 < hierarchy.length) {
    return hierarchy[currentIndex + 1];
  }

  // Reached the end of the hierarchy
  return null;
};

export const canOriginate = (category, userRole) => {
  if (!userRole) return false;
  if (userRole.toLowerCase() === 'admin') return true; // admin can originate everything
  
  const typeKey = getDocumentTypeKey(category);
  if (!typeKey || !DOCUMENT_ORIGINATORS[typeKey]) return false;
  
  const allowedRoles = DOCUMENT_ORIGINATORS[typeKey];
  return allowedRoles.includes(userRole.toLowerCase());
};
