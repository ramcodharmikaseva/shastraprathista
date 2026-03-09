const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit'); // You'll need to install: npm install pdfkit

class ReceiptGenerator {
    static async generatePaymentReceipt(payment, student) {
        return new Promise((resolve, reject) => {
            try {
                // Create receipts directory if it doesn't exist
                const receiptsDir = path.join(__dirname, '../receipts');
                if (!fs.existsSync(receiptsDir)) {
                    fs.mkdirSync(receiptsDir, { recursive: true });
                }
                
                const filename = `receipt_${payment.receiptNo}_${Date.now()}.pdf`;
                const filePath = path.join(receiptsDir, filename);
                
                // Create PDF document
                const doc = new PDFDocument({ margin: 50 });
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);
                
                // School Header
                doc.fontSize(20)
                   .font('Helvetica-Bold')
                   .text('P.A.C. RAMASAMY RAJA MEMORIAL MUSIC SCHOOL', { align: 'center' })
                   .fontSize(12)
                   .font('Helvetica')
                   .text('Smt. Lingammal Ramaraju Shastraprathista Trust', { align: 'center' })
                   .text('Chennai - 600001', { align: 'center' })
                   .moveDown();
                
                // Receipt Title
                doc.moveDown()
                   .fontSize(18)
                   .font('Helvetica-Bold')
                   .text('PAYMENT RECEIPT', { align: 'center' })
                   .moveDown();
                
                // Receipt Details Box
                doc.rect(50, doc.y, 500, 100).stroke()
                   .fontSize(10)
                   .font('Helvetica');
                
                // Left column
                doc.text(`Receipt No: ${payment.receiptNo}`, 60, doc.y + 15)
                   .text(`Date: ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}`, 60, doc.y + 30)
                   .text(`Payment ID: ${payment.paymentId}`, 60, doc.y + 45);
                
                // Right column
                doc.text(`Student ID: ${student.studentId}`, 300, doc.y - 60)
                   .text(`Student Name: ${student.name}`, 300, doc.y - 45)
                   .text(`Class: ${student.className}`, 300, doc.y - 30);
                
                doc.moveDown(4);
                
                // Payment Details Table
                const tableTop = doc.y;
                doc.font('Helvetica-Bold');
                
                // Table Header
                doc.rect(50, tableTop, 500, 25).fill('#f0f0f0')
                   .fillColor('black')
                   .text('Description', 60, tableTop + 8)
                   .text('Month', 250, tableTop + 8)
                   .text('Amount (₹)', 400, tableTop + 8);
                
                doc.font('Helvetica');
                
                // Table Row
                doc.text('Monthly Fee', 60, tableTop + 38)
                   .text(payment.month, 250, tableTop + 38)
                   .text(payment.amount.toString(), 400, tableTop + 38);
                
                // Total
                doc.moveDown(3)
                   .font('Helvetica-Bold')
                   .text(`Total Amount: ₹${payment.amount}`, 400, doc.y + 20, { align: 'right' })
                   .text(`(In words: ${this.numberToWords(payment.amount)} Rupees only)`, 50, doc.y + 20, { align: 'left', fontSize: 9 });
                
                // Payment Method
                doc.moveDown(3)
                   .font('Helvetica')
                   .text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, 50, doc.y + 30)
                   .text(`Transaction ID: ${payment.transactionId || 'N/A'}`, 50, doc.y + 15);
                
                // Footer
                doc.moveDown(5)
                   .fontSize(10)
                   .text('This is a computer generated receipt and does not require signature.', 50, doc.y + 50, { align: 'center', fontSize: 8 })
                   .text('For any queries, contact: shastraprathista@gmail.com | 8870454321', 50, doc.y + 15, { align: 'center', fontSize: 8 });
                
                // Signature
                doc.text('Authorized Signatory', 400, doc.y + 40, { align: 'right' })
                   .text('(School Administrator)', 400, doc.y + 15, { align: 'right', fontSize: 8 });
                
                doc.end();
                
                stream.on('finish', () => resolve({ filename, filePath, url: `/receipts/${filename}` }));
                stream.on('error', reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    static numberToWords(num) {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        
        if (num === 0) return 'Zero';
        
        function convert(n) {
            if (n < 10) return ones[n];
            if (n < 20) return teens[n - 10];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
            return '';
        }
        
        return convert(num);
    }
    
    static async generateHTMLReceipt(payment, student) {
        // Simple HTML receipt for email
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .receipt { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
                .header { text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
                .school-name { color: #2c3e50; font-size: 20px; font-weight: bold; }
                .receipt-title { color: #d4af37; font-size: 18px; margin: 20px 0; }
                .details { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; margin: 10px 0; }
                .label { font-weight: bold; color: #34495e; }
                .amount { font-size: 18px; color: #27ae60; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <div class="school-name">P.A.C. RAMASAMY RAJA MEMORIAL MUSIC SCHOOL</div>
                    <div>Smt. Lingammal Ramaraju Shastraprathista Trust</div>
                    <div>Chennai - 600001</div>
                </div>
                
                <div class="receipt-title">PAYMENT RECEIPT</div>
                
                <div class="details">
                    <div class="row">
                        <span class="label">Receipt No:</span>
                        <span>${payment.receiptNo}</span>
                    </div>
                    <div class="row">
                        <span class="label">Date:</span>
                        <span>${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div class="row">
                        <span class="label">Student ID:</span>
                        <span>${student.studentId}</span>
                    </div>
                    <div class="row">
                        <span class="label">Student Name:</span>
                        <span>${student.name}</span>
                    </div>
                    <div class="row">
                        <span class="label">Class:</span>
                        <span>${student.className}</span>
                    </div>
                    <div class="row">
                        <span class="label">Month:</span>
                        <span>${payment.month}</span>
                    </div>
                    <div class="row">
                        <span class="label">Payment Method:</span>
                        <span>${payment.paymentMethod.toUpperCase()}</span>
                    </div>
                    <div class="row">
                        <span class="label">Transaction ID:</span>
                        <span>${payment.transactionId || 'N/A'}</span>
                    </div>
                    <div class="row" style="margin-top: 20px;">
                        <span class="label">Amount Paid:</span>
                        <span class="amount">₹${payment.amount}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is a computer generated receipt</p>
                    <p>For queries: shastraprathista@gmail.com | 8870454321</p>
                </div>
            </div>
        </body>
        </html>
        `;
        
        return html;
    }
}

module.exports = ReceiptGenerator;