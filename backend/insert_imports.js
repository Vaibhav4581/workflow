const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'Archive.jsx',
  'Dashboard.jsx',
  'LoginPage.jsx',
  'MySubmission.jsx',
  'NewSubmission.jsx',
  'ReceivedFormView.jsx'
];

const processDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        processDir(fullPath);
      }
    } else if (filesToUpdate.includes(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('import { ROLES, isRole }')) {
        // Calculate relative path to utils/roles.js
        const utilsPath = path.relative(path.dirname(fullPath), path.join(__dirname, '../frontend/src/utils/roles')).replace(/\\/g, '/');
        const importStr = `import { ROLES, isRole } from '${utilsPath.startsWith('.') ? utilsPath : './' + utilsPath}';\n`;
        content = importStr + content;
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file} with import from ${utilsPath}`);
      }
    }
  }
};

processDir(path.join(__dirname, '../frontend/src'));
console.log('Done inserting imports');
