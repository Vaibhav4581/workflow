import re
import sys

def replace_pdf_code(filepath, data_var_name):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The new base64 loader
    base64_loader = """
  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: c.toDataURL('image/jpeg'), w: img.width, h: img.height });
      };
      img.onerror = reject;
      img.src = url;
    });
"""

    # The new PDF logic
    pdf_logic = f"""
  const handleDownloadPdf = async () => {{
    {f"setDownloading(true);" if data_var_name == 'form' else ""}
    try {{
      const doc   = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const L     = 20;
      const R     = pageW - 20;
      const W     = R - L;

      let y = 15;

      try {{
        const logo = await loadImageAsBase64('/sngce.jpg');
        const aspect = logo.w / logo.h;
        
        let logoW, logoH;
        if (aspect > 2) {{
          logoW = 80;
          logoH = 80 / aspect;
          doc.addImage(logo.data, 'JPEG', pageW / 2 - logoW / 2, y, logoW, logoH);
          y += logoH + 6;
        }} else {{
          logoH = 22;
          logoW = 22 * aspect;
          doc.addImage(logo.data, 'JPEG', pageW / 2 - logoW / 2, y, logoW, logoH);
          y += logoH + 6;
        }}
      }} catch (e) {{
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(26, 20, 100);
        doc.text('SNGCE', pageW / 2, y + 10, {{ align: 'center' }});
        y += 20;
      }}

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Sree Narayana Gurukulam College of Engineering', pageW / 2, y, {{ align: 'center' }});
      y += 4;
      doc.setFontSize(8);
      doc.text('www.sngce.ac.in', pageW / 2, y, {{ align: 'center' }});
      y += 6;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(L, y, R, y);
      doc.setLineWidth(0.15);
      doc.line(L, y + 1.2, R, y + 1.2);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text('OFFICIAL SUBMISSION FORM', pageW / 2, y, {{ align: 'center' }});
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Ref No:', L, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String({data_var_name}.formNo || {data_var_name}._id || ''), L + 14, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', R - 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text({data_var_name}.createdAt ? new Date({data_var_name}.createdAt).toISOString().split('T')[0] : '', R - 15, y);
      y += 6;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(L, y, R, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      
      doc.setFont('helvetica', 'bold');
      doc.text('To,', L, y);
      doc.setFont('helvetica', 'normal');
      const recipientLabel = Array.isArray({data_var_name}.to) ? {data_var_name}.to.join(', ') : ({data_var_name}.to || '');
      const recipLines = doc.splitTextToSize(recipientLabel, (W / 2) - 15);
      doc.text(recipLines, L + 10, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.text('From,', pageW / 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text({data_var_name}.submittedBy || '', pageW / 2 + 12, y + 5);

      y += Math.max(recipLines.length * 5, 15) + 12;

      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(230, 233, 236);
      doc.setLineWidth(0.2);
      
      const subjectLines = doc.splitTextToSize(`Subject: ${{ {data_var_name}.subject || '' }}`, W - 10);
      const boxH = subjectLines.length * 6 + 10;
      
      doc.roundedRect(L, y, W, boxH, 2, 2, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text(subjectLines, L + 5, y + 8);
      
      y += boxH + 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text('Respected Sir / Madam,', L, y);
      y += 8;

      const bodyLines = doc.splitTextToSize({data_var_name}.details || '', W);
      bodyLines.forEach(line => {{
        doc.text(line, L, y);
        y += 6;
      }});
      
      y += 4;

      if ({data_var_name}.subjectElaboration) {{
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        const elaLines = doc.splitTextToSize(`Additional Details: ${{ {data_var_name}.subjectElaboration }}`, W);
        elaLines.forEach(line => {{
          doc.text(line, L, y);
          y += 5.5;
        }});
        doc.setFont('helvetica', 'normal');
        y += 6;
      }}

      if ({data_var_name}.attachments && {data_var_name}.attachments.length > 0) {{
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text('Enclosures Attached:', L, y);
        doc.setFont('helvetica', 'normal');
        {data_var_name}.attachments.forEach((f, i) => {{ 
          y += 5; 
          doc.text(`• ${{f.filename || f.name}}`, L + 5, y); 
        }});
        y += 10;
      }}

      if (pageH - y < 60) {{
        doc.addPage();
        y = 20;
      }} else {{
        y += 15;
      }}

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text('Yours faithfully,', L, y);
      y += 18;

      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(L, y, L + 50, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text({data_var_name}.submittedBy || '', L, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text('(Signature of Applicant)', L, y + 10);

      const boxWidth = 75;
      const boxX = R - boxWidth;
      const boxY = y - 25;
      
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxWidth, 42, 2, 2);
      
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(boxX, boxY, boxWidth, 8, 2, 2, 'FD');
      
      doc.rect(boxX, boxY + 6, boxWidth, 2, 'F');
      doc.line(boxX, boxY + 8, boxX + boxWidth, boxY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text('FOR OFFICIAL USE ONLY', boxX + boxWidth / 2, boxY + 5.5, {{ align: 'center' }});

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Received Date:', boxX + 4, boxY + 14);
      doc.text('Processed By:', boxX + 4, boxY + 22);
      doc.text('Status / Remarks:', boxX + 4, boxY + 30);
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(boxX + 28, boxY + 14, boxX + boxWidth - 4, boxY + 14);
      doc.line(boxX + 26, boxY + 22, boxX + boxWidth - 4, boxY + 22);
      doc.line(boxX + 4, boxY + 38, boxX + boxWidth - 4, boxY + 38);

      doc.setFillColor(26, 20, 100);
      doc.rect(0, pageH - 11, pageW, 11, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(200, 200, 255);
      doc.text(
        'SNGCE – St. George College of Engineering  ·  www.sngce.ac.in',
        pageW / 2, pageH - 4.5, {{ align: 'center' }}
      );

      // NO ROADMAP appended, just save
      doc.save(`form_${{{data_var_name}.formNo || {data_var_name}._id}}.pdf`);
    }} catch (e) {{
      console.error(e);
      alert('Failed to generate PDF');
    }} { "finally { setDownloading(false); }" if data_var_name == 'form' else "" }
  }};
"""

    pattern = re.compile(r'const loadImageAsBase64 =.*?const handleDownloadPdf = async \(\) => \{.*?(?:catch\s*\(e\)\s*\{\s*console\.error\(e\);\s*alert\(\'Failed to generate PDF\'\);\s*\}(?:\s*finally\s*\{\s*setDownloading\(false\);\s*\})?\s*\};)', re.DOTALL)
    
    if pattern.search(content):
        new_content = pattern.sub(base64_loader + pdf_logic, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated", filepath)
    else:
        print("Could not find pattern in", filepath)

if __name__ == '__main__':
    replace_pdf_code('c:/Users/vaibh/Downloads/workflow/frontend/src/pages/ReceivedFormView.jsx', 'form')
    replace_pdf_code('c:/Users/vaibh/Downloads/workflow/frontend/src/pages/SubmissionView.jsx', 'submission')
