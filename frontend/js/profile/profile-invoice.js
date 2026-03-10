// profile-invoice.js
class ProfileInvoice {
    constructor() {
        this.utils = window.ProfileUtils;
        // Cache for logo image to avoid reloading
        this.cachedLogo = null;
        this.logoLoaded = false;
    }

    async downloadInvoice(orderId, event = null) {
        console.log('📄 Downloading invoice for order:', orderId);
        
        let button = null;
        if (event && event.target) {
            button = event.target.closest('button.invoice-btn, .invoice-btn');
        }
        
        let originalText = 'Download PDF';
        let originalDisabled = false;
        
        if (button) {
            originalText = button.innerHTML;
            originalDisabled = button.disabled;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            button.disabled = true;
        }

        try {
            this.utils.showTopToast("Generating PDF invoice...", "info");
            
            // Pre-load logo before starting PDF generation
            await this.preloadLogo();
            
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Please login to download invoice");

            // Fetch order from API
            const api = new window.ProfileAPI();
            const response = await fetch(`${api.API_BASE_URL}/profile/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Failed to fetch order: ${response.status}`);

            const apiResult = await response.json();
            if (!apiResult.success) throw new Error(apiResult.message || 'Failed to load order');

            const order = this.utils.normalizeOrderStructure(apiResult.order);
            console.log('✅ Order found from API:', order.orderId);

            // Check if jsPDF is loaded
            if (typeof window.jspdf === 'undefined') {
                await this.loadJSPDFLibrary();
            }

            const pdfResult = await this.generateInvoiceSafely(order);
            
            if (pdfResult.success) {
                this.utils.showTopToast("PDF invoice downloaded successfully!", "success");
            } else {
                this.utils.showTopToast(`Failed to generate PDF: ${pdfResult.error}`, "error");
            }
            
        } catch (error) {
            console.error("❌ Error generating invoice:", error);
            this.utils.showTopToast(`Failed to generate PDF: ${error.message}`, "error");
        } finally {
            if (button) {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = originalDisabled;
                }, 500);
            }
        }
    }

    // Preload logo to ensure it's available
    async preloadLogo() {
        if (this.logoLoaded && this.cachedLogo) {
            return true;
        }
        
        return new Promise((resolve) => {
            const img = new Image();
            const logoPaths = [
                '../../image/logo.jpg',  // Your working path
                '../image/logo.jpg',
                'image/logo.jpg',
                window.location.origin + '/image/logo.jpg'
            ];
            
            let currentPathIndex = 0;
            
            img.onload = () => {
                console.log('✅ Logo preloaded successfully');
                this.cachedLogo = img;
                this.logoLoaded = true;
                resolve(true);
            };
            
            img.onerror = () => {
                currentPathIndex++;
                if (currentPathIndex < logoPaths.length) {
                    console.log(`🔄 Trying logo path ${currentPathIndex + 1}: ${logoPaths[currentPathIndex]}`);
                    img.src = logoPaths[currentPathIndex];
                } else {
                    console.log('❌ Could not preload logo');
                    resolve(false);
                }
            };
            
            console.log(`🖼️ Preloading logo from: ${logoPaths[0]}`);
            img.src = logoPaths[0];
            
            setTimeout(() => {
                if (!img.complete) {
                    console.log('⏰ Logo preload timeout');
                    resolve(false);
                }
            }, 3000);
        });
    }

    async generateInvoiceSafely(order) {
        try {
            console.log('🚀 Starting invoice generation for order:', order.orderId);
            const fileName = await this.generatePDFInvoice(order);
            console.log('✅ Invoice generated successfully:', fileName);
            return { success: true, fileName };
        } catch (error) {
            console.error('❌ Invoice generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async generatePDFInvoice(order) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            console.log('✅ jsPDF instance created');

            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            let currentY = 15;
            
            // ===== HEADER WITH LOGO =====
            // Add logo at top left - matching your old invoice
            const logoAdded = await this.addLogoToPDF(doc, currentY);
            
            // Header text - positioned to match your old invoice
            // Trust Name - Centered (but accounting for logo on left)
            doc.setFontSize(13); // Slightly larger like old invoice
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(139, 0, 0); // Dark Red
            
            // Center text but account for logo space
            const headerX = pageWidth / 2;
            doc.text('SMT LINGAMMAL RAMARAJU SHASTRAPRATHISTA TRUST', headerX, currentY, { align: 'center' });
            
            currentY += 6;
            
            // Subtitle - Blue like old invoice
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic', 'bold');
            doc.setTextColor(0, 0, 255); // Blue
            doc.text('"RAMCO DHARMIKA SEVA"', headerX, currentY, { align: 'center' });
            
            currentY += 7;
            
            // Address - 3 lines like old invoice
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0); // Black
            doc.text('No.1, P.A.C. Ramasamy Raja Road, Rajapalayam - 626 117,', headerX, currentY, { align: 'center' });
            currentY += 4;
            doc.text('Tamilnadu, India.', headerX, currentY, { align: 'center' });
            currentY += 4;
            doc.text('email: shastraprathista@gmail.com, Mob: 88704 12345.', headerX, currentY, { align: 'center' });
            
            currentY += 2;
            
            // ===== INVOICE TITLE =====
            // Double line separator like old invoice
            doc.setDrawColor(0, 0, 0);
            currentY += 3;
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 8;
            
            // INVOICE in larger font, centered
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', headerX, currentY, { align: 'center' });
            currentY += 8;
            
            // ===== INVOICE DETAILS =====
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            
            // Left: Invoice No
            doc.text(`Invoice No: ${order.orderId || order.id || 'ORD1767160435005HP10T'}`, margin, currentY);
            
            // Right: Invoice Date
            const invoiceDate = order.date ? new Date(order.date).toLocaleDateString('en-GB') : '31/12/2025';
            doc.text(`Invoice Date: ${invoiceDate}`, pageWidth - margin, currentY, { align: 'right' });
            
            currentY += 9;
            
            // ===== ADDRESSES SECTION =====
            // Two columns like old invoice
            const addressCol1X = margin;
            const addressCol2X = pageWidth / 2 + 10;
            
            // Column headers
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('BILL TO:', addressCol1X, currentY);
            doc.text('SHIP TO:', addressCol2X, currentY);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            
            const billing = order.billingAddress || {};
            const shipping = order.shippingAddress || {};
            
            // Extract address data
            const billingName = billing.fullName || billing.name || 'Rama Krishna';
            const billingAddress = billing.addressLine1 || billing.address || '123 Spiritual Street';
            const billingCity = billing.city || 'Varanasi';
            const billingDistrict = billing.district || 'Virudunagar';
            const billingState = billing.state || 'Uttar Pradesh';
            const billingPincode = billing.pincode || '221001';
            const billingEmail = order.contact?.email || 'shastraprathista@gmail.com';
            const billingPhone = billing.phone || order.contact?.phone || '9876543210';
            
            const shippingName = shipping.fullName || shipping.name || billingName || 'Rama Krishna';
            const shippingAddress = shipping.addressLine1 || shipping.address || billingAddress || '123 Spiritual Street';
            const shippingCity = shipping.city || billingCity || 'Varanasi';
            const shippingDistrict = shipping.district || billingDistrict || 'Virudunagar';
            const shippingState = shipping.state || billingState || 'Uttar Pradesh';
            const shippingPincode = shipping.pincode || billingPincode || '221001';
            const shippingPhone = shipping.phone || billingPhone || '9876543210';
            
            // BILL TO details - formatted exactly like old invoice
            let billY = currentY + 5;
            doc.text(`Name: ${billingName}`, addressCol1X, billY);
            doc.text(`Address: ${billingAddress}`, addressCol1X, billY + 4);
            doc.text(`City: ${billingCity}`, addressCol1X, billY + 8);
            doc.text(`District: ${billingDistrict}`, addressCol1X, billY + 12);
            doc.text(`State: ${billingState} - ${billingPincode}`, addressCol1X, billY + 16);
            doc.text(`Email: ${billingEmail}`, addressCol1X, billY + 20);
            doc.text(`Phone: ${billingPhone}`, addressCol1X, billY + 24);
            
            // SHIP TO details
            let shipY = currentY + 5;
            doc.text(`Name: ${shippingName}`, addressCol2X, shipY);
            doc.text(`Address: ${shippingAddress}`, addressCol2X, shipY + 4);
            doc.text(`City: ${shippingCity}`, addressCol2X, shipY + 8);
            doc.text(`District: ${shippingDistrict}`, addressCol2X, shipY + 12);
            doc.text(`State: ${shippingState} - ${shippingPincode}`, addressCol2X, shipY + 16);
            doc.text(`Phone: ${shippingPhone}`, addressCol2X, shipY + 20);
            
            currentY += 35; // Space for addresses
            
            // ===== ITEMS TABLE =====
            // Check if we need new page
            if (currentY > pageHeight - 150) {
                doc.addPage();
                currentY = margin;
                await this.addPageHeader(doc, currentY, 2, order);
                currentY += 30;
            }
            
            // Table header with lines like old invoice
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            
            // Column positions (adjusted to match old invoice spacing)
            const colSNo = margin;
            const colTitle = margin + 15;
            const colMRP = 125;
            const colQty = 145;
            const colTotal = 155;
            const colDiscount = 170;
            const colSubtotal = 185;
            
            // Top line
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 5;
            
            // Column headers
            doc.text('S.No', colSNo, currentY);
            doc.text('Book Title', colTitle, currentY);
            doc.text('MRP', colMRP, currentY);
            doc.text('Qty', colQty, currentY);
            doc.text('Total', colTotal, currentY);
            doc.text('Discount', colDiscount, currentY);
            doc.text('Subtotal', colSubtotal, currentY);
            
            currentY += 5;
            // Bottom line
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 8;
            
            // Items data
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            
            const items = order.items || [];
            let totalMRP = 0;
            let totalDiscount = 0;
            let totalSubtotal = 0;
            let pageNumber = 1;
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                // Check if we need new page
                if (currentY > pageHeight - 40) {
                    doc.addPage();
                    pageNumber++;
                    currentY = margin;
                    await this.addPageHeader(doc, currentY, pageNumber, order);
                    currentY += 30;
                    
                    // Re-add table headers
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.line(margin, currentY, pageWidth - margin, currentY);
                    currentY += 5;
                    doc.text('S.No', colSNo, currentY);
                    doc.text('Book Title', colTitle, currentY);
                    doc.text('MRP', colMRP, currentY);
                    doc.text('Qty', colQty, currentY);
                    doc.text('Total', colTotal, currentY);
                    doc.text('Discount', colDiscount, currentY);
                    doc.text('Subtotal', colSubtotal, currentY);
                    currentY += 5;
                    doc.line(margin, currentY, pageWidth - margin, currentY);
                    currentY += 8;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                }
                
                // Calculate item values
                const mrp = item.originalPrice || item.original_price || item.mrp || 
                           (item.price && item.discount ? item.price + (item.discount / (item.quantity || 1)) : 0);
                
                const price = item.sellingPrice || item.price || 
                             (item.subtotal ? item.subtotal / (item.quantity || 1) : 0);
                
                const quantity = item.quantity || item.qty || 1;
                
                const itemMRPTotal = mrp * quantity;
                const itemSubtotal = price * quantity;
                const itemDiscount = Math.max(0, itemMRPTotal - itemSubtotal);
                
                // Accumulate totals
                totalMRP += itemMRPTotal;
                totalDiscount += itemDiscount;
                totalSubtotal += itemSubtotal;
                
                // S.No
                doc.text(`${i + 1}.`, colSNo, currentY);
                
                // Book Title (with wrapping like old invoice)
                const maxTitleWidth = 85;
                const titleLines = doc.splitTextToSize(item.title || `Book ${i + 1}`, maxTitleWidth);
                
                // Print title lines
                titleLines.forEach((line, idx) => {
                    doc.text(line, colTitle, currentY + (idx * 3.5));
                });
                
                const lineHeight = Math.max(5, titleLines.length * 3.5);
                
                // Other columns
                doc.text(mrp.toFixed(2), colMRP, currentY);
                doc.text(quantity.toString(), colQty, currentY);
                doc.text(itemMRPTotal.toFixed(2), colTotal, currentY);
                doc.text(itemDiscount > 0 ? itemDiscount.toFixed(2) : '-', colDiscount, currentY);
                doc.text(itemSubtotal.toFixed(2), colSubtotal, currentY);
                
                currentY += lineHeight + 2; // Slightly more spacing
            }
            
            currentY += 10;
            
            // ===== SUMMARY SECTION =====
            // Check if we need new page for summary
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = margin;
                await this.addPageHeader(doc, currentY, pageNumber + 1, order);
                currentY += 30;
            }
            
            // Left: Amount in Words
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Amount in Words:', margin, currentY);
            
            // Right: Summary header
            const summaryX = pageWidth - margin;
            doc.text('Summary:', summaryX, currentY, { align: 'right' });
            
            currentY += 5;
            
            // Amount in words text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            
            const shippingCharge = Number(order.totals?.shipping ?? 0);
            const grandTotal = totalSubtotal + shippingCharge;
            const amountInWords = this.convertToWords(grandTotal);
            const wordsLines = doc.splitTextToSize(amountInWords, pageWidth / 2 - margin - 10);
            
            // Print amount in words
            wordsLines.forEach((line, idx) => {
                doc.text(line, margin + 5, currentY + (idx * 4));
            });
            
            const wordsHeight = Math.max(20, wordsLines.length * 4);
            
            // Summary details (right side)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            const summaryStartY = currentY;
            doc.text(`Total MRP: ${totalMRP.toFixed(2)}`, summaryX, summaryStartY, { align: 'right' });
            doc.text(`Total Discount: -${totalDiscount.toFixed(2)}`, summaryX, summaryStartY + 6, { align: 'right' });
            doc.text(`Subtotal: ${totalSubtotal.toFixed(2)}`, summaryX, summaryStartY + 12, { align: 'right' });
            doc.text(`Shipping Charge: +${shippingCharge.toFixed(2)}`, summaryX, summaryStartY + 18, { align: 'right' });
            
            // Grand Total
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, summaryX, summaryStartY + 30, { align: 'right' });
            
            currentY += Math.max(wordsHeight, 40);
            
            // ===== FOOTER =====
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Powered by: Shastraprathista', pageWidth / 2, pageHeight - 15, { align: 'center' });
            
            // Optional separator line
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
            
            // ===== SAVE PDF =====
            console.log('✅ All PDF content added, saving...');
            
            const fileName = `Invoice_${order.orderId || order.id || 'ORD1767160435005HP10T'}.pdf`;
            doc.save(fileName);
            
            console.log('✅ PDF saved successfully as:', fileName);
            
            return fileName;
            
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            this.utils.showTopToast(`Failed to generate PDF: ${error.message}`, "error");
            throw error;
        }
    }

    async addPageHeader(doc, currentY, pageNumber, order) {
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        
        // Add logo for subsequent pages
        await this.addLogoToPDF(doc, currentY);
        
        // Compact header for page 2+
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(139, 0, 0);
        doc.text('SMT LINGAMMAL RAMARAJU SHASTRAPRATHISTA TRUST', pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 5;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic', 'bold');
        doc.setTextColor(0, 0, 255);
        doc.text('"RAMCO DHARMIKA SEVA"', pageWidth / 2, currentY, { align: 'center' });
        
        currentY += 8;
        
        // Invoice details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Invoice No: ${order.orderId || order.id || 'ORD1767160435005HP10T'}`, margin, currentY);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, currentY, { align: 'right' });
        
        currentY += 10;
        
        return currentY;
    }

    // Simplified logo function using preloaded image
    async addLogoToPDF(doc, currentY) {
        try {
            if (this.cachedLogo && this.logoLoaded) {
                // Use cached logo
                const margin = 15;
                const logoWidth = 20;
                const logoHeight = 20;
                
                doc.addImage(this.cachedLogo, 'JPEG', margin, currentY, logoWidth, logoHeight);
                console.log('✅ Logo added from cache');
                return true;
            } else {
                // Try to load logo
                return new Promise((resolve) => {
                    const img = new Image();
                    const margin = 15;
                    
                    img.crossOrigin = 'Anonymous';
                    
                    img.onload = () => {
                        try {
                            const logoWidth = 20;
                            const logoHeight = 20;
                            doc.addImage(img, 'JPEG', margin, currentY, logoWidth, logoHeight);
                            console.log('✅ Logo loaded and added to PDF');
                            
                            // Cache for future use
                            this.cachedLogo = img;
                            this.logoLoaded = true;
                            resolve(true);
                        } catch (error) {
                            console.error('❌ Error adding logo:', error);
                            resolve(false);
                        }
                    };
                    
                    img.onerror = () => {
                        console.log('❌ Could not load logo image');
                        resolve(false);
                    };
                    
                    // Use the confirmed working path
                    img.src = '../../image/logo.jpg';
                    
                    // Timeout
                    setTimeout(() => {
                        if (!img.complete) {
                            console.log('⏰ Logo loading timeout');
                            resolve(false);
                        }
                    }, 2000);
                });
            }
        } catch (error) {
            console.error('❌ Error in addLogoToPDF:', error);
            return false;
        }
    }

    loadJSPDFLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof window.jspdf !== "undefined") {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                console.log('✅ jsPDF loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load jsPDF');
                reject(new Error('Failed to load PDF library'));
            };
            document.head.appendChild(script);
        });
    }

    convertToWords(amount) {
        if (isNaN(amount) || amount === 0) {
            return 'Zero Rupees Only';
        }
        
        const rupees = Math.floor(amount);
        let words = this.convertNumberToWords(rupees);
        words = words.charAt(0).toUpperCase() + words.slice(1);
        return words + ' Rupees Only';
    }

    convertNumberToWords(num) {
        if (num === 0) return 'zero';
        
        const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 
                    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 
                    'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const scales = ['', 'thousand', 'lakh', 'crore'];
        
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
        
        if (num < 1000) {
            const hundred = Math.floor(num / 100);
            const remainder = num % 100;
            return ones[hundred] + ' hundred' + (remainder !== 0 ? ' ' + this.convertNumberToWords(remainder) : '');
        }
        
        let scaleIndex = 0;
        let words = [];
        
        while (num > 0) {
            if (scaleIndex === 0) {
                const chunk = num % 1000;
                if (chunk !== 0) {
                    words.unshift(this.convertNumberToWords(chunk) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : ''));
                }
                num = Math.floor(num / 1000);
                scaleIndex++;
            } else {
                const chunk = num % 100;
                if (chunk !== 0) {
                    words.unshift(this.convertNumberToWords(chunk) + ' ' + scales[scaleIndex]);
                }
                num = Math.floor(num / 100);
                scaleIndex++;
            }
        }
        
        return words.join(' ');
    }
}

// Export as global
window.ProfileInvoice = new ProfileInvoice();
window.downloadInvoice = function(orderId, event) {
    window.ProfileInvoice.downloadInvoice(orderId, event);
};