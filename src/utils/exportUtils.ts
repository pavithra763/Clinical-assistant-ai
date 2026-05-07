
export function downloadAsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAsPdf(filename: string, summary: string, prescription: any, doctorName: string, clinicName: string, clinicAddress: string, dateTimeFormat: string) {
  // This is a placeholder for real PDF generation. 
  // In a real app, you'd use jspdf or similar.
  const content = `
    ${clinicName}
    ${clinicAddress}
    
    Doctor: ${doctorName}
    Date: ${new Date().toLocaleDateString()}
    
    SUMMARY:
    ${summary}
    
    PRESCRIPTION:
    ${JSON.stringify(prescription, null, 2)}
  `;
  downloadAsFile(filename.replace('.pdf', '.txt'), content);
}
