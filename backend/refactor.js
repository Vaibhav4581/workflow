const fs = require('fs');
const path = require('path');

const replaceRoles = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace double OR conditions first
  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:admin|Admin)['"]\s*\|\|\s*(?:userRole|role|currentUser\.role)\s*===\s*['"](?:admin|Admin)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.ADMIN)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:student|Student)['"]\s*\|\|\s*(?:userRole|role|currentUser\.role)\s*===\s*['"](?:student|Student)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.STUDENT)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Principal|principal)['"]\s*\|\|\s*(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Principal|principal)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.PRINCIPAL)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:HOD|hod)['"]\s*\|\|\s*(?:userRole|role|currentUser\.role)\s*===\s*['"](?:HOD|hod)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.HOD)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Manager|manager)['"]\s*\|\|\s*(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Manager|manager)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.MANAGER)`;
  });

  // Replace singles
  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:FacultyAdvisor)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.FACULTY_ADVISOR)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:HOD)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.HOD)`;
  });
  
  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Faculty)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.FACULTY)`;
  });

  content = content.replace(/(?:userRole|role|currentUser\.role)\s*===\s*['"](?:Student)['"]/g, (match) => {
    const varName = match.split('===')[0].trim();
    return `isRole(${varName}, ROLES.STUDENT)`;
  });

  fs.writeFileSync(filePath, content);
};

const processDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceRoles(fullPath);
    }
  }
};

replaceRoles(path.join(__dirname, 'index.js'));
processDir(path.join(__dirname, '../frontend/src'));
console.log('Done refactoring');
