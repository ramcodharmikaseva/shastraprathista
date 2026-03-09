// ========== PAYMENT MANAGEMENT ==========

async function loadPaymentDashboard() {
    try {
        // Helper functions
        const getStudentFee = (student) => {
            return student.totalMonthlyFee || student.monthlyFee || 0;
        };
        
        const getClassNames = (student) => {
            if (student.classes && student.classes.length > 0) {
                return student.classes.map(c => c.className).join(', ');
            }
            return student.className || 'No classes';
        };
        
        // ===== Pending Payments =====
        const pendingResponse = await fetch(`${API_BASE}/payments/pending`);
        const pendingData = await pendingResponse.json();
        
        if (pendingData.success) {
            const pendingCount = document.getElementById('pendingCount');
            if (pendingCount) pendingCount.textContent = pendingData.count || 0;
            
            const pendingList = document.getElementById('pendingList');
            if (pendingList) {
                let pendingHTML = '';
                (pendingData.students || []).slice(0, 5).forEach(student => {
                    const classNames = getClassNames(student);
                    const totalFee = getStudentFee(student);
                    
                    pendingHTML += `
                        <div class="payment-item" onclick="viewStudent('${student.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${escapeHtml(student.name)}</strong><br>
                                <small>${student.studentId || 'N/A'} • ${classNames}</small>
                            </div>
                            <div class="payment-amount">₹${totalFee}</div>
                        </div>
                    `;
                });
                
                if (!pendingData.students || pendingData.students.length === 0) {
                    pendingHTML = '<p style="text-align:center;color:#7f8c8d;">No pending payments</p>';
                }
                
                pendingList.innerHTML = pendingHTML;
            }
        }
        
        // ===== Overdue Payments =====
        const overdueResponse = await fetch(`${API_BASE}/payments/overdue`);
        const overdueData = await overdueResponse.json();
        
        if (overdueData.success) {
            const overdueCount = document.getElementById('overdueCount');
            if (overdueCount) overdueCount.textContent = overdueData.count || 0;
            
            const overdueList = document.getElementById('overdueList');
            if (overdueList) {
                let overdueHTML = '';
                (overdueData.students || []).slice(0, 5).forEach(student => {
                    const dueDate = student.nextPaymentDue
                        ? new Date(student.nextPaymentDue).toLocaleDateString()
                        : 'Not set';
                    
                    const classNames = getClassNames(student);
                    const totalFee = getStudentFee(student);
                    
                    overdueHTML += `
                        <div class="payment-item" onclick="viewStudent('${student.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${escapeHtml(student.name)}</strong><br>
                                <small>${student.studentId || 'N/A'} • ${classNames} • Due: ${dueDate}</small>
                            </div>
                            <div class="payment-amount">₹${totalFee}</div>
                        </div>
                    `;
                });
                
                if (!overdueData.students || overdueData.students.length === 0) {
                    overdueHTML = '<p style="text-align:center;color:#7f8c8d;">No overdue payments</p>';
                }
                
                overdueList.innerHTML = overdueHTML;
            }
        }
        
        // ===== Paid This Month =====
        const currentMonth = new Date().toISOString().slice(0, 7);
        const paidResponse = await fetch(`${API_BASE}/payments/paid?month=${currentMonth}`);
        const paidData = await paidResponse.json();
        
        if (paidData.success) {
            const paidCount = document.getElementById('paidCount');
            if (paidCount) paidCount.textContent = paidData.count || 0;
            
            const paidList = document.getElementById('paidList');
            if (paidList) {
                let paidHTML = '';
                (paidData.payments || []).slice(0, 5).forEach(payment => {
                    paidHTML += `
                        <div class="payment-item" onclick="viewStudent('${payment.studentId}')" style="cursor: pointer;">
                            <div class="payment-info">
                                <strong>${escapeHtml(payment.studentName)}</strong><br>
                                <small>${payment.studentId || 'N/A'} • ${payment.month || ''}</small>
                            </div>
                            <div class="payment-amount">₹${payment.amount || 0}</div>
                        </div>
                    `;
                });
                
                if (!paidData.payments || paidData.payments.length === 0) {
                    paidHTML = '<p style="text-align:center;color:#7f8c8d;">No payments this month</p>';
                }
                
                paidList.innerHTML = paidHTML;
            }
        }
        
        loadPaymentHistory();
        
    } catch (error) {
        console.error('Error loading payment dashboard:', error);
        showToast('Failed to load payment data', 'error');
    }
}

async function loadPaymentHistory() {
    try {
        const response = await fetch(`${API_BASE}/payments/history?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            const historyContainer = document.getElementById('paymentHistory');
            if (!historyContainer) return;
            
            let historyHTML = '<div style="background: white; border-radius: 8px; overflow: hidden;">';
            (data.payments || []).forEach(payment => {
                const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A';
                historyHTML += `
                    <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" 
                         onclick="viewStudent('${payment.studentId}')">
                        <div>
                            <strong>${escapeHtml(payment.studentName)}</strong><br>
                            <small>${payment.studentId || 'N/A'} • ${payment.month || ''} • ${paymentDate}</small>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: #2c3e50;">₹${payment.amount || 0}</div>
                            <span class="payment-status-badge status-paid" style="font-size: 0.8em;">
                                ${payment.paymentMethod || 'Cash'}
                            </span>
                        </div>
                    </div>
                `;
            });
            historyHTML += '</div>';
            historyContainer.innerHTML = historyHTML;
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
    }
}

function markPaymentForStudent(studentId, studentName) {
    closeModal();
    showTab('managePayments');
    
    const paymentStudentId = document.getElementById('paymentStudentId');
    if (paymentStudentId) {
        paymentStudentId.value = studentId;
    }
    
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0');
    
    const paymentMonth = document.getElementById('paymentMonth');
    if (paymentMonth) {
        paymentMonth.value = currentMonth;
    }
    
    // Trigger amount display
    setTimeout(() => showAutoAmount(), 100);
    
    showToast(`Full monthly fee will be collected for ${escapeHtml(studentName)}`);
}

// ========== OPTION 2: ACCUMULATED PAYMENTS ==========

// Enhanced showAutoAmount with pending months
async function showAutoAmount() {
    const paymentStudentIdEl = document.getElementById('paymentStudentId');
    const studentId = paymentStudentIdEl ? paymentStudentIdEl.value.trim() : '';
    const display = document.getElementById('autoAmountDisplay');
    
    if (!display) return;
    
    if (!studentId) {
        display.innerHTML = '';
        return;
    }
    
    try {
        // Show loading
        display.innerHTML = '<div style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        // Get GST percentage
        const gstPercentage = await getGSTPercentage();
        
        // Get student details
        const studentResponse = await fetch(`${API_BASE}/students/${studentId}`);
        const studentData = await studentResponse.json();
        
        if (!studentData.success) {
            display.innerHTML = `<span style="color:red;">Student not found</span>`;
            return;
        }
        
        const student = studentData.student;
        const monthlyBaseFee = student.totalMonthlyFee || student.monthlyFee || 0;
        
        if (monthlyBaseFee <= 0) {
            display.innerHTML = `<span style="color:red;">No fee assigned to this student</span>`;
            return;
        }
        
        // Get pending months (ONLY PAST MONTHS)
        const pendingResponse = await fetch(`${API_BASE}/payments/pending-months/${studentId}`);
        const pendingData = await pendingResponse.json();
        
        window.pendingData = pendingData;
        
        const pendingCount = pendingData.pendingCount || 0;
        const pendingMonths = pendingData.pendingMonths || [];
        
        if (pendingCount === 0) {
            display.innerHTML = `
                <div style="background: #d4f8e8; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #27ae60;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle" style="color: #27ae60; font-size: 24px;"></i>
                        <div>
                            <strong style="color: #27ae60;">No Pending Payments</strong>
                            <p style="margin: 5px 0 0 0; color: #2c3e50;">All past months are paid up to ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Calculate total for pending months only
        const totalBaseAmount = monthlyBaseFee * pendingCount;
        const { gstAmount, totalAmount } = calculateWithGST(totalBaseAmount, gstPercentage);
        
        let html = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 10px; border-left: 4px solid #e67e22;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold; color: #856404;">
                        <i class="fas fa-exclamation-triangle"></i> PENDING MONTHS (${pendingCount})
                    </span>
                    <span style="font-weight: bold; color: #856404;">₹${monthlyBaseFee * pendingCount}</span>
                </div>
                <div style="font-size: 0.95em; margin-bottom: 15px; color: #856404; background: #fff; padding: 10px; border-radius: 6px;">
                    ${pendingMonths.join(' • ')}
                </div>
                <hr style="margin: 10px 0; border-top: 1px dashed #e67e22;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
                    <span>Total Base Amount:</span>
                    <span>₹${totalBaseAmount}</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #e67e22; margin-bottom: 5px;">
                    <span>GST (${gstPercentage}%):</span>
                    <span>₹${gstAmount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2em; color: #27ae60; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e67e22;">
                    <span>TOTAL PAYABLE:</span>
                    <span>₹${totalAmount.toFixed(2)}</span>
                </div>
                <div style="font-size: 0.85em; color: #7f8c8d; margin-top: 10px; text-align: center;">
                    <i class="fas fa-info-circle"></i> You are paying for ${pendingCount} past pending month(s) only
                </div>
            </div>
        `;
        
        display.innerHTML = html;
        
    } catch (error) {
        console.error('Error in showAutoAmount:', error);
        display.innerHTML = `<span style="color:red;">Error loading fee details</span>`;
    }
}

// Updated markPayment function - ONLY pays pending months, not current month
async function markPayment() {
    const paymentStudentIdEl = document.getElementById('paymentStudentId');
    const studentId = paymentStudentIdEl ? paymentStudentIdEl.value.trim() : '';
    const paymentMethod = 'cash'; // or get from dropdown if you have one
    
    if (!studentId) {
        showToast('Please enter Student ID', 'error');
        return;
    }
    
    // Get loading element once to reuse
    const loadingEl = document.getElementById('loading');
    
    try {
        // Show loading
        if (loadingEl) loadingEl.style.display = 'block';   
        
        // Get GST percentage
        const gstPercentage = await getGSTPercentage();
        
        // Verify student exists
        const verifyResponse = await fetch(`${API_BASE}/students/${studentId}`);
        const verifyData = await verifyResponse.json();
        
        if (!verifyData.success) {
            if (loadingEl) loadingEl.style.display = 'none';
            showToast('Student ID not found', 'error');
            return;
        }
        
        const student = verifyData.student;
        const monthlyBaseFee = student.totalMonthlyFee || student.monthlyFee || 0;
        
        if (monthlyBaseFee <= 0) {
            if (loadingEl) loadingEl.style.display = 'none';
            showToast('Student has no assigned fee', 'error');
            return;
        }
        
        // Get pending months data (ONLY PAST MONTHS)
        const pendingResponse = await fetch(`${API_BASE}/payments/pending-months/${studentId}`);
        const pendingData = await pendingResponse.json();
        window.pendingData = pendingData;
        
        const pendingRawMonths = pendingData.pendingRawMonths || [];
        const pendingCount = pendingData.pendingCount || 0;
        
        // Check if there are any pending months
        if (pendingCount === 0) {
            if (loadingEl) loadingEl.style.display = 'none';
            showToast('✅ No pending payments. All past months are paid!', 'success');
            
            // Clear input
            if (paymentStudentIdEl) paymentStudentIdEl.value = '';
            return;
        }
        
        // Calculate total for pending months ONLY (not including current month)
        const totalBaseAmount = monthlyBaseFee * pendingCount;
        const { gstAmount, totalAmount } = calculateWithGST(totalBaseAmount, gstPercentage);
        
        // Show confirmation
        let confirmMessage = `💰 PAYMENT SUMMARY for ${student.name}\n`;
        confirmMessage += `══════════════════════════════\n`;
        confirmMessage += `Monthly Fee: ₹${monthlyBaseFee}\n`;
        confirmMessage += `\n⚠️ PENDING MONTHS (${pendingCount}):\n`;
        
        pendingData.pendingMonths.forEach(month => {
            confirmMessage += `   • ${month}\n`;
        });
        
        confirmMessage += `──────────────────────────\n`;
        confirmMessage += `Total Base: ₹${totalBaseAmount}\n`;
        confirmMessage += `GST (${gstPercentage}%): ₹${gstAmount.toFixed(2)}\n`;
        confirmMessage += `──────────────────────────\n`;
        confirmMessage += `💵 TOTAL AMOUNT: ₹${totalAmount.toFixed(2)}\n\n`;
        confirmMessage += `⚠️ Note: You are only paying for PAST pending months.\n`;
        confirmMessage += `Current month (${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}) is NOT included.\n\n`;
        confirmMessage += `Proceed with payment?`;
        
        if (!confirm(confirmMessage)) {
            if (loadingEl) loadingEl.style.display = 'none';
            return;
        }
        
        // Process payments for pending months only
        let successCount = 0;
        let failedMonths = [];
        
        for (const pendingMonth of pendingRawMonths) {
            try {
                const result = await createSinglePayment(
                    student, 
                    pendingMonth, 
                    monthlyBaseFee, 
                    gstPercentage, 
                    paymentMethod
                );
                if (result.success) {
                    successCount++;
                } else {
                    failedMonths.push(pendingMonth);
                }
            } catch (error) {
                console.error(`Failed payment for ${pendingMonth}:`, error);
                failedMonths.push(pendingMonth);
            }
        }
        
        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Show result
        if (failedMonths.length === 0) {
            showToast(
                `✅ SUCCESS! Paid for ${successCount} pending month(s)`, 
                'success'
            );
            
            // Clear input and refresh
            if (paymentStudentIdEl) paymentStudentIdEl.value = '';
            
            const amountDisplay = document.getElementById('autoAmountDisplay');
            if (amountDisplay) amountDisplay.innerHTML = '';
            
            window.pendingData = null;
            
            // Refresh all data
            if (typeof loadPaymentDashboard === 'function') loadPaymentDashboard();
            if (typeof loadStudents === 'function') loadStudents();
            if (typeof loadDashboardStats === 'function') loadDashboardStats();
            
        } else {
            showToast(
                `⚠️ Partial success: ${successCount} paid, ${failedMonths.length} failed`, 
                'error'
            );
        }
        
    } catch (error) {
        if (loadingEl) loadingEl.style.display = 'none';
        console.error('Error marking payment:', error);
        showToast('Failed to mark payment: ' + error.message, 'error');
    }
}

// Helper function to create single payment
async function createSinglePayment(student, month, baseAmount, gstPercentage, method) {
    const { gstAmount, totalAmount } = calculateWithGST(baseAmount, gstPercentage);
    
    // Get class name
    let className = 'Music Class';
    if (student.classes && student.classes.length > 0) {
        className = student.classes[0].className;
    } else if (student.className) {
        className = student.className;
    }
    
    const response = await fetch(`${API_BASE}/payments/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: student.studentId,
            studentName: student.name,
            className: className,
            amount: totalAmount,
            baseAmount: baseAmount,
            gstAmount: gstAmount,
            gstPercentage: gstPercentage,
            month: month,
            paymentMethod: method,
            notes: method === 'cash' ? 'Cash payment (including pending months)' : 'Online payment (including pending months)'
        })
    });
    
    return await response.json();
}

// Add a function to view pending months summary
async function viewPendingSummary() {
    const studentId = prompt('Enter Student ID to view pending months:');
    if (!studentId) return;
    
    try {
        const response = await fetch(`${API_BASE}/payments/pending-months/${studentId}`);
        const data = await response.json();
        
        if (data.success) {
            const monthlyFee = data.monthlyFee || 0;
            const totalPendingAmount = monthlyFee * data.pendingCount;
            
            alert(
                `📊 PENDING SUMMARY for ${data.studentName}\n` +
                `══════════════════════════════\n` +
                `Pending Months: ${data.pendingCount}\n` +
                `Monthly Fee: ₹${monthlyFee}\n` +
                `Total Pending: ₹${totalPendingAmount}\n` +
                `\nPending Months:\n${data.pendingMonths.join('\n')}`
            );
        } else {
            alert('Student not found or no pending months');
        }
    } catch (error) {
        alert('Error fetching pending summary');
    }
}

async function viewAllPayments(studentId) {
    try {
        const response = await fetch(`${API_BASE}/payments/student/${studentId}`);
        const data = await response.json();
        
        if (data.success) {
            let allPaymentsHTML = '<h4 style="color: #34495e; margin-bottom: 15px;">All Payments</h4>';
            
            if (data.payments?.length > 0) {
                allPaymentsHTML += '<div style="max-height: 400px; overflow-y: auto;">';
                data.payments.forEach(payment => {
                    const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A';
                    allPaymentsHTML += `
                        <div class="payment-history-item">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${payment.month || 'N/A'}</strong><br>
                                    <small>Paid on: ${paymentDate}</small><br>
                                    <small>Method: ${payment.paymentMethod || 'Cash'}</small>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #2c3e50;">₹${payment.amount || 0}</div>
                                    ${payment.notes ? `<div style="font-size: 0.8em; color: #7f8c8d;">${escapeHtml(payment.notes)}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
                allPaymentsHTML += '</div>';
            } else {
                allPaymentsHTML += '<p style="color: #7f8c8d; text-align: center;">No payments found</p>';
            }
            
            // Show in modal
            const modalTitle = document.getElementById('modalTitle');
            const modalContent = document.getElementById('modalContent');
            const studentModal = document.getElementById('studentModal');
            
            if (modalTitle) modalTitle.textContent = 'All Payments';
            if (modalContent) {
                modalContent.innerHTML = `
                    <div style="max-height: 500px; overflow-y: auto;">
                        ${allPaymentsHTML}
                    </div>
                `;
            }
            if (studentModal) studentModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading all payments:', error);
        showToast('Failed to load payment history', 'error');
    }
}

// Make payment functions globally available
window.loadPaymentDashboard = loadPaymentDashboard;
window.markPaymentForStudent = markPaymentForStudent;
window.showAutoAmount = showAutoAmount;
window.markPayment = markPayment;
window.viewAllPayments = viewAllPayments;
window.viewPendingSummary = viewPendingSummary;
