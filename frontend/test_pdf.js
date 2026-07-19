import { jsPDF } from "jspdf";
import * as fs from 'fs';

async function generateTestPDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const L = 14;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.text("Test PDF", L, 20);

  // Add History
  doc.addPage();
  const y = 20;
  doc.text("History Page", L, y);
  
  // Try to save to a buffer (Node.js environment)
  const arrayBuffer = doc.output('arraybuffer');
  fs.writeFileSync('test_pdf.pdf', Buffer.from(arrayBuffer));
  console.log('Test PDF generated successfully.');
}

generateTestPDF().catch(console.error);
