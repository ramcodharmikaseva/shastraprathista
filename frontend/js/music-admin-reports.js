// ========== REPORT FUNCTIONS ==========

// Update initReportsTab function
function initReportsTab() {
    console.log('📊 Initializing Reports tab...');
    
    // Set default dates to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    
    if (fromDateInput) {
        fromDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    }
    if (toDateInput) {
        toDateInput.value = lastDayOfMonth.toISOString().split('T')[0];
    }
    
    // Load class filter options with correct endpoint
    loadClassFilterOptions().catch(error => {
        console.warn('Using fallback for class filter options');
        addFallbackClassOptions();
    });
    
    // Check if teacher-wise endpoint exists
    checkTeacherWiseEndpoint();
}

// Fix the check teacher-wise endpoint function
async function checkTeacherWiseEndpoint() {
    try {
        const response = await fetch(`${API_BASE}/reports/teacher-wise?from=2024-01-01&to=2024-01-31`);
        if (response.ok) {
            console.log('✅ Teacher-wise endpoint available');
        } else {
            console.warn('Teacher-wise endpoint returned:', response.status);
        }
    } catch (error) {
        console.warn('Teacher-wise endpoint check failed:', error.message);
    }
}

// Fix the loadClassFilterOptions function - use correct endpoint
async function loadClassFilterOptions() {
    try {
        const classFilter = document.getElementById('reportClassFilter');
        if (!classFilter) return;
        
        // Use the correct endpoint from music.js
        const response = await fetch(`${API_BASE}/class-configurations`);
        const data = await response.json();
        
        if (data.success && data.configurations) {
            // Clear existing options except the first one
            while (classFilter.options.length > 1) {
                classFilter.remove(1);
            }
            
            // Add class options
            data.configurations.forEach(config => {
                const option = document.createElement('option');
                option.value = config.className;
                option.textContent = config.className;
                classFilter.appendChild(option);
            });
            
            console.log('✅ Loaded class filter options:', data.configurations.length);
        } else {
            console.warn('Using fallback class options');
            addFallbackClassOptions();
        }
    } catch (error) {
        console.error('Error loading class filter options:', error);
        addFallbackClassOptions();
    }
}

// Add fallback class options
function addFallbackClassOptions() {
    const classFilter = document.getElementById('reportClassFilter');
    if (!classFilter) return;
    
    // Clear existing options except the first one
    while (classFilter.options.length > 1) {
        classFilter.remove(1);
    }
    
    const fallbackClasses = [
        'Carnatic Vocal - A',
        'Carnatic Vocal - B',
        'Carnatic Vocal - C',
        'Veena',
        'Violin',
        'Mridangam',
        'Keyboard',
        'Bharatanatyam'
    ];
    
    fallbackClasses.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classFilter.appendChild(option);
    });
    
    console.log('✅ Added fallback class options');
}

async function generateReport() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const classFilter = document.getElementById('reportClassFilter')?.value || '';
    
    if (!fromDate || !toDate) {
        showToast('Please select date range', 'error');
        return;
    }
    
    // Show loading state
    const reportPreview = document.getElementById('reportPreview');
    if (reportPreview) {
        reportPreview.innerHTML = `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 10px;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #3498db;"></i>
                <p style="margin-top: 20px; color: #7f8c8d;">Generating report...</p>
            </div>
        `;
    }
    
    try {
        let url = `${API_BASE}/reports/summary?from=${fromDate}&to=${toDate}`;
        if (classFilter) {
            url += `&className=${encodeURIComponent(classFilter)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayReportPreview(data, fromDate, toDate, classFilter);
        } else {
            showToast(data.message || 'Failed to generate report', 'error');
            if (reportPreview) {
                reportPreview.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 10px; color: #e74c3c;">
                        <i class="fas fa-exclamation-circle fa-3x"></i>
                        <p style="margin-top: 20px;">${data.message || 'Failed to generate report'}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Failed to generate report', 'error');
        if (reportPreview) {
            reportPreview.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 10px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <p style="margin-top: 20px;">Network error. Please try again.</p>
                </div>
            `;
        }
    }
}

function displayReportPreview(data, fromDate, toDate, classFilter) {
    const reportPreview = document.getElementById('reportPreview');
    if (!reportPreview) return;
    
    const summary = data.summary || {};
    const classWise = data.classWise || [];
    const monthlyTrend = data.monthlyTrend || [];
    
    // Calculate totals
    const totalCollection = summary.totalCollection || 0;
    const pendingAmount = summary.pendingAmount || 0;
    
    let previewHTML = `
        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h4 style="color: #2c3e50; margin: 0;">
                    <i class="fas fa-chart-pie"></i> Report Preview 
                </h4>
                <div style="display: flex; gap: 10px;">
                    <span style="background: #3498db; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">
                        ${classFilter || 'All Classes'}
                    </span>
                    <span style="background: #2c3e50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">
                        ${fromDate} to ${toDate}
                    </span>
                </div>
            </div>
            
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">Total Collection</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${totalCollection.toLocaleString()}</div>
                    <div style="font-size: 0.8rem; margin-top: 5px;">${summary.totalPayments || 0} payments</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">Pending Amount</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${pendingAmount.toLocaleString()}</div>
                    <div style="font-size: 0.8rem; margin-top: 5px;">from active students</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #5fa2d6 0%, #3183c8 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">Active Students</div>
                    <div style="font-size: 2rem; font-weight: bold;">${summary.activeStudents || 0}</div>
                    <div style="font-size: 0.8rem; margin-top: 5px;">out of ${summary.totalStudents || 0} total</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">Collection Rate</div>
                    <div style="font-size: 2rem; font-weight: bold;">${((totalCollection / (totalCollection + pendingAmount)) * 100 || 0).toFixed(1)}%</div>
                    <div style="font-size: 0.8rem; margin-top: 5px;">of expected amount</div>
                </div>
            </div>
            
            <!-- Monthly Trend -->
            ${monthlyTrend.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h5 style="color: #34495e; margin: 0 0 15px 0;">
                        <i class="fas fa-chart-line"></i> Monthly Trend (Last 6 Months)
                    </h5>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${monthlyTrend.map(month => `
                            <div style="flex: 1; min-width: 100px; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 0.8rem; color: #7f8c8d;">${month._id}</div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: #27ae60;">₹${month.totalAmount.toLocaleString()}</div>
                                <div style="font-size: 0.7rem; color: #7f8c8d;">${month.paymentCount} payments</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Two Column Layout -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Left Column: Class-wise Table -->
                <div>
                    <h5 style="color: #34495e; margin: 0 0 15px 0;">
                        <i class="fas fa-chart-bar"></i> Class-wise Details
                    </h5>
                    <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #eee;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #2c3e50; color: white;">
                                    <th style="padding: 12px; text-align: left;">Class</th>
                                    <th style="padding: 12px; text-align: right;">Students</th>
                                    <th style="padding: 12px; text-align: right;">Active</th>
                                    <th style="padding: 12px; text-align: right;">Paid</th>
                                    <th style="padding: 12px; text-align: right;">Monthly Fee</th>
                                </tr>
                            </thead>
                            <tbody>
    `;
    
    if (classWise.length === 0) {
        previewHTML += `
            <tr>
                <td colspan="5" style="padding: 20px; text-align: center; color: #7f8c8d;">
                    No class data available
                </td>
            </tr>
        `;
    } else {
        classWise.forEach(item => {
            const className = item._id || 'Unknown';
            const totalStudents = item.studentCount || 0;
            const activeCount = item.activeCount || 0;
            const paidCount = item.paidCount || 0;
            const monthlyFee = item.totalMonthlyFee || 0;
            
            previewHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${className}</td>
                    <td style="padding: 12px; text-align: right;">${totalStudents}</td>
                    <td style="padding: 12px; text-align: right;">${activeCount}</td>
                    <td style="padding: 12px; text-align: right; color: ${paidCount > 0 ? '#27ae60' : '#7f8c8d'};">${paidCount}</td>
                    <td style="padding: 12px; text-align: right;">₹${monthlyFee.toLocaleString()}</td>
                </tr>
            `;
        });
    }
    
    previewHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Right Column: Quick Actions -->
                <div>
                    <h5 style="color: #34495e; margin: 0 0 15px 0;">
                        <i class="fas fa-download"></i> Export Options
                    </h5>
                    <div style="display: grid; gap: 10px;">
                        <button class="btn btn-primary" onclick="downloadReport('payment')" style="width: 100%;">
                            <i class="fas fa-file-invoice"></i> Payment Report
                        </button>
                        <button class="btn btn-success" onclick="downloadReport('student')" style="width: 100%;">
                            <i class="fas fa-users"></i> Student Report
                        </button>
                        <button class="btn btn-info" onclick="downloadReport('monthly')" style="width: 100%; background: #3498db; color: white;">
                            <i class="fas fa-calendar-alt"></i> Monthly Summary
                        </button>
                        <button class="btn btn-warning" onclick="downloadReport('overdue')" style="width: 100%; background: #f39c12; color: white;">
                            <i class="fas fa-exclamation-triangle"></i> Overdue Report
                        </button>
                        <button class="btn btn-danger" onclick="downloadReport('full')" style="width: 100%; background: #e74c3c; color: white;">
                            <i class="fas fa-file-export"></i> Full Student Report
                        </button>
                    </div>
                    
                    <!-- Quick Stats -->
                    <div style="margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h6 style="color: #2c3e50; margin: 0 0 10px 0;">Quick Stats</h6>
                        <div style="display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Collection Efficiency:</span>
                                <strong>${((totalCollection / (totalCollection + pendingAmount)) * 100 || 0).toFixed(1)}%</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Avg per Payment:</span>
                                <strong>₹${totalCollection > 0 ? (totalCollection / summary.totalPayments).toFixed(0) : 0}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Students per Class:</span>
                                <strong>${(summary.activeStudents / (classWise.length || 1)).toFixed(1)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button class="btn btn-secondary" onclick="generateTeacherWiseReport()">
                    <i class="fas fa-chalkboard-teacher"></i> Teacher-wise Report
                </button>
                <button class="btn btn-secondary" onclick="printReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
                <button class="btn btn-secondary" onclick="downloadFullReport('${fromDate}', '${toDate}', '${classFilter}')">
                    <i class="fas fa-file-export"></i> Export All Data
                </button>
            </div>
        </div>
    `;
    
    reportPreview.innerHTML = previewHTML;
}

// Enhanced Teacher-wise report functions

// Fix the teacher-wise report function
async function generateTeacherWiseReport() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    
    if (!fromDate || !toDate) {
        showToast('Please select date range first', 'error');
        return;
    }
    
    showToast('Generating teacher-wise report...', 'info');
    
    // Show loading state
    const reportPreview = document.getElementById('reportPreview');
    if (reportPreview) {
        reportPreview.innerHTML = `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 10px;">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #3498db;"></i>
                <p style="margin-top: 20px; color: #7f8c8d;">Fetching teacher data...</p>
            </div>
        `;
    }
    
    try {
        // Use the correct endpoint from music.js
        const response = await fetch(`${API_BASE}/reports/teacher-wise?from=${fromDate}&to=${toDate}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // DEBUG: Log the entire data structure
        console.log('📊 RAW TEACHER-WISE DATA:', data);
        console.log('📊 instructorWise:', data.instructorWise);
        console.log('📊 classInstructorBreakdown:', data.classInstructorBreakdown);
        console.log('📊 teacherWise (if exists):', data.teacherWise);
        
        if (data.success) {
            // Check if we have data in either format
            if (data.instructorWise && data.instructorWise.length > 0) {
                displayTeacherWiseReport(data, fromDate, toDate);
            } else if (data.teacherWise && data.teacherWise.length > 0) {
                // If backend still uses teacherWise, convert it
                const convertedData = {
                    ...data,
                    instructorWise: data.teacherWise,
                    classInstructorBreakdown: data.classInstructorBreakdown || []
                };
                displayTeacherWiseReport(convertedData, fromDate, toDate);
            } else {
                // No data available
                reportPreview.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 10px;">
                        <i class="fas fa-info-circle fa-3x" style="color: #f39c12;"></i>
                        <p style="margin-top: 20px; color: #7f8c8d;">No instructor data available for this period.</p>
                        <p style="color: #7f8c8d;">Please check:</p>
                        <ul style="text-align: left; display: inline-block; color: #7f8c8d;">
                            <li>✓ Teachers are configured in the Teachers tab</li>
                            <li>✓ Students are assigned to classes with instructors</li>
                            <li>✓ Payments exist for the selected date range</li>
                        </ul>
                        <button class="btn btn-primary" onclick="generateTeacherWiseReport()" style="margin-top: 15px;">
                            <i class="fas fa-sync-alt"></i> Try Again
                        </button>
                    </div>
                `;
            }
        } else {
            showToast(data.message || 'Failed to generate teacher-wise report', 'error');
        }
    } catch (error) {
        console.error('Error generating teacher-wise report:', error);
        showToast('Failed to generate teacher-wise report: ' + error.message, 'error');
        
        if (reportPreview) {
            reportPreview.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 10px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                    <p style="margin-top: 20px;">Failed to generate teacher-wise report</p>
                    <p style="color: #7f8c8d; margin-top: 10px;">${error.message}</p>
                </div>
            `;
        }
    }
}

// Alternative method to generate teacher-wise report
async function generateTeacherReportAlternative(fromDate, toDate) {
    try {
        // Get class configurations with teachers
        const classResponse = await fetch(`${API_BASE}/class-configs`);
        const classData = await classResponse.json();
        
        if (!classData.success) {
            showToast('Failed to fetch class data', 'error');
            return;
        }
        
        // Get payments for the period
        const paymentResponse = await fetch(`${API_BASE}/reports/export/payment?from=${fromDate}&to=${toDate}`);
        const paymentData = await paymentResponse.json();
        
        // Parse payments from CSV if needed
        let payments = [];
        if (paymentData.success && paymentData.csv) {
            // Parse CSV to get payment data
            const lines = paymentData.csv.split('\n');
            if (lines.length > 1) {
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',');
                        payments.push({
                            className: values[3]?.replace(/"/g, '') || '',
                            amount: parseFloat(values[4]) || 0
                        });
                    }
                }
            }
        }
        
        // Create teacher-class mapping
        const teacherMap = {};
        classData.configurations.forEach(config => {
            if (!teacherMap[config.teacherName]) {
                teacherMap[config.teacherName] = {
                    teacherName: config.teacherName,
                    classes: [],
                    totalCollection: 0,
                    paymentCount: 0,
                    classDetails: []
                };
            }
            teacherMap[config.teacherName].classes.push(config.className);
            teacherMap[config.teacherName].classDetails.push({
                className: config.className,
                collection: 0
            });
        });
        
        // Calculate collections
        payments.forEach(payment => {
            for (const [teacherName, teacherData] of Object.entries(teacherMap)) {
                if (teacherData.classes.includes(payment.className)) {
                    teacherData.totalCollection += payment.amount;
                    teacherData.paymentCount++;
                    
                    const classDetail = teacherData.classDetails.find(c => c.className === payment.className);
                    if (classDetail) {
                        classDetail.collection += payment.amount;
                    }
                    break;
                }
            }
        });
        
        // Format data for display
        const teacherWiseData = Object.values(teacherMap)
            .filter(teacher => teacher.totalCollection > 0 || teacher.classes.length > 0);
        
        const totalCollection = teacherWiseData.reduce((sum, t) => sum + t.totalCollection, 0);
        
        displayTeacherWiseReport({
            success: true,
            teacherWise: teacherWiseData,
            summary: {
                totalTeachers: teacherWiseData.length,
                totalCollection: totalCollection,
                totalPayments: teacherWiseData.reduce((sum, t) => sum + t.paymentCount, 0)
            },
            period: { from: fromDate, to: toDate }
        }, fromDate, toDate);
        
    } catch (error) {
        console.error('Error in alternative teacher report:', error);
        showToast('Failed to generate teacher-wise report', 'error');
        
        const reportPreview = document.getElementById('reportPreview');
        if (reportPreview) {
            reportPreview.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 10px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                    <p style="margin-top: 20px;">Failed to generate teacher-wise report</p>
                    <p style="color: #7f8c8d; margin-top: 10px;">Please make sure teachers are configured in the Teachers tab.</p>
                </div>
            `;
        }
    }
}

function displayTeacherWiseReport(data, fromDate, toDate) {
    const reportPreview = document.getElementById('reportPreview');
    if (!reportPreview) return;
    
    // Use instructorWise instead of teacherWise
    const instructorWise = data.instructorWise || [];
    const classInstructorBreakdown = data.classInstructorBreakdown || [];
    const summary = data.summary || {};
    
    console.log('📊 Instructor-wise data:', instructorWise);
    console.log('📊 Class-instructor breakdown:', classInstructorBreakdown);
    
    let html = `
        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h4 style="color: #2c3e50; margin: 0;">
                    <i class="fas fa-chalkboard-teacher"></i> Instructor-wise Collection Report
                </h4>
                <div>
                    <button class="btn btn-secondary" onclick="generateReport()" style="margin-right: 10px;">
                        <i class="fas fa-arrow-left"></i> Back to Summary
                    </button>
                    <span style="background: #2c3e50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">
                        ${fromDate} to ${toDate}
                    </span>
                </div>
            </div>
            
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9;">Total Instructors</div>
                    <div style="font-size: 2rem; font-weight: bold;">${summary.totalInstructors || 0}</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9;">Total Collection</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${(summary.totalCollection || 0).toLocaleString()}</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #5fa2d6 0%, #3183c8 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9;">Total Students</div>
                    <div style="font-size: 2rem; font-weight: bold;">${summary.totalStudents || 0}</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9;">Avg per Instructor</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${(summary.averagePerInstructor || 0).toLocaleString()}</div>
                </div>
            </div>
    `;
    
    if (instructorWise.length === 0 && classInstructorBreakdown.length === 0) {
        html += `
            <div style="text-align: center; padding: 50px; background: #f8f9fa; border-radius: 10px;">
                <i class="fas fa-info-circle fa-3x" style="color: #7f8c8d;"></i>
                <p style="margin-top: 20px; color: #7f8c8d;">No instructor data available for this period.</p>
                <p style="color: #7f8c8d;">Make sure you have teachers configured and payments recorded.</p>
            </div>
        `;
    } else {
        // First, show class-instructor breakdown with separate rows for each instructor
        if (classInstructorBreakdown.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h5 style="color: #34495e; margin: 0 0 15px 0;">
                        <i class="fas fa-chart-pie"></i> Class-wise Instructor Breakdown
                    </h5>
                    <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #eee;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #2c3e50; color: white;">
                                    <th style="padding: 12px; text-align: left;">Class</th>
                                    <th style="padding: 12px; text-align: left;">Instructor</th>
                                    <th style="padding: 12px; text-align: right;">Students</th>
                                    <th style="padding: 12px; text-align: right;">Payments</th>
                                    <th style="padding: 12px; text-align: right;">Collection</th>
                                    <th style="padding: 12px; text-align: right;">Share %</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            classInstructorBreakdown.forEach(classItem => {
                let firstRow = true;
                const classTotal = classItem.totalClassCollection || 0;
                
                // Sort instructors by collection amount (highest first)
                const sortedInstructors = (classItem.instructors || []).sort((a, b) => (b.collection || 0) - (a.collection || 0));
                
                sortedInstructors.forEach(instructor => {
                    const collection = instructor.collection || 0;
                    const studentCount = instructor.studentCount || 0;
                    const paymentCount = instructor.paymentCount || 0;
                    const percentage = classTotal > 0 ? ((collection / classTotal) * 100).toFixed(1) : 0;
                    
                    // Highlight Carnatic Vocal instructors
                    const isCarnaticVocal = classItem.className.includes('Carnatic Vocal');
                    const rowStyle = isCarnaticVocal ? 'background: #fff3e0;' : '';
                    
                    html += `
                        <tr style="border-bottom: 1px solid #eee; ${rowStyle}">
                            ${firstRow ? 
                                `<td rowspan="${classItem.instructors.length}" style="padding: 12px; font-weight: bold; vertical-align: middle; background: #f8f9fa;">${classItem.className}</td>` 
                                : ''}
                            <td style="padding: 12px;">
                                <i class="fas fa-user" style="color: #3498db; margin-right: 5px;"></i>
                                ${instructor.instructorName || 'Unknown'}
                                ${isCarnaticVocal ? '<span style="margin-left: 5px; color: #f39c12;">🎵</span>' : ''}
                            </td>
                            <td style="padding: 12px; text-align: right;">${studentCount}</td>
                            <td style="padding: 12px; text-align: right;">${paymentCount}</td>
                            <td style="padding: 12px; text-align: right; color: #27ae60;">₹${collection.toLocaleString()}</td>
                            <td style="padding: 12px; text-align: right;">
                                <span style="background: ${percentage > 30 ? '#27ae60' : '#f39c12'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem;">
                                    ${percentage}%
                                </span>
                            </td>
                        </tr>
                    `;
                    firstRow = false;
                });
                
                // Add class total row
                html += `
                    <tr style="background: #e3f2fd; font-weight: bold;">
                        <td colspan="2" style="padding: 8px 12px; text-align: right;">Class Total:</td>
                        <td style="padding: 8px 12px; text-align: right;">${classItem.totalClassStudents || 0}</td>
                        <td style="padding: 8px 12px; text-align: right;">${classItem.instructors.reduce((sum, i) => sum + (i.paymentCount || 0), 0)}</td>
                        <td style="padding: 8px 12px; text-align: right; color: #27ae60;">₹${(classItem.totalClassCollection || 0).toLocaleString()}</td>
                        <td style="padding: 8px 12px; text-align: right;">100%</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        // Then show instructor-wise summary
        html += `
            <h5 style="color: #34495e; margin: 20px 0 15px 0;">
                <i class="fas fa-users"></i> Instructor-wise Summary
            </h5>
            <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #eee;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #2c3e50; color: white;">
                            <th style="padding: 12px; text-align: left;">Instructor</th>
                            <th style="padding: 12px; text-align: left;">Classes</th>
                            <th style="padding: 12px; text-align: right;">Students</th>
                            <th style="padding: 12px; text-align: right;">Payments</th>
                            <th style="padding: 12px; text-align: right;">Collection</th>
                            <th style="padding: 12px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (instructorWise.length === 0) {
            html += `
                <tr>
                    <td colspan="6" style="padding: 20px; text-align: center; color: #7f8c8d;">
                        No instructor-wise data available
                    </td>
                </tr>
            `;
        } else {
            instructorWise.forEach(instructor => {
                html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px; font-weight: bold;">
                            <i class="fas fa-chalkboard-teacher" style="color: #9b59b6; margin-right: 5px;"></i>
                            ${instructor.instructorName}
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                ${(instructor.classes || []).map(className => 
                                    `<span style="background: #e1f5fe; color: #0288d1; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem;">${className}</span>`
                                ).join('')}
                            </div>
                        </td>
                        <td style="padding: 12px; text-align: right;">${instructor.studentCount || 0}</td>
                        <td style="padding: 12px; text-align: right;">${instructor.paymentCount || 0}</td>
                        <td style="padding: 12px; text-align: right; color: #27ae60; font-weight: bold;">₹${(instructor.totalCollection || 0).toLocaleString()}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button class="btn btn-secondary" onclick="viewTeacherDetails('${instructor.instructorName}')" style="padding: 5px 10px; font-size: 0.9rem;">
                                <i class="fas fa-eye"></i> Details
                            </button>
                        </td>
                    </tr>
                `;
                
                // Add class details for this instructor
                if (instructor.classDetails && instructor.classDetails.length > 0) {
                    instructor.classDetails.forEach(classDetail => {
                        if (classDetail.collection > 0 || classDetail.studentCount > 0) {
                            html += `
                                <tr style="background: #f8f9fa; font-size: 0.9rem;">
                                    <td style="padding: 5px 12px 5px 30px; color: #7f8c8d;" colspan="2">
                                        <i class="fas fa-level-indent"></i> ${classDetail.className}
                                    </td>
                                    <td style="padding: 5px 12px; text-align: right; color: #7f8c8d;">${classDetail.studentCount || 0}</td>
                                    <td style="padding: 5px 12px; text-align: right; color: #7f8c8d;">${classDetail.paymentCount || 0}</td>
                                    <td style="padding: 5px 12px; text-align: right; color: #7f8c8d;">₹${(classDetail.collection || 0).toLocaleString()}</td>
                                    <td style="padding: 5px 12px;"></td>
                                </tr>
                            `;
                        }
                    });
                }
            });
            
            // Add total row
            html += `
                <tr style="background: #2c3e50; color: white; font-weight: bold;">
                    <td style="padding: 12px;">TOTAL</td>
                    <td style="padding: 12px;">${instructorWise.reduce((sum, t) => sum + (t.classes?.length || 0), 0)} classes</td>
                    <td style="padding: 12px; text-align: right;">${summary.totalStudents || 0}</td>
                    <td style="padding: 12px; text-align: right;">${summary.totalPayments || 0}</td>
                    <td style="padding: 12px; text-align: right;">₹${(summary.totalCollection || 0).toLocaleString()}</td>
                    <td style="padding: 12px;"></td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-success" onclick="exportTeacherReport()">
                    <i class="fas fa-download"></i> Export Instructor Report (CSV)
                </button>
                <button class="btn btn-secondary" onclick="printTeacherReport()">
                    <i class="fas fa-print"></i> Print Report
                </button>
            </div>
        `;
    }
    
    html += `</div>`;
    reportPreview.innerHTML = html;
}

async function viewTeacherDetails(teacherName) {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    
    showToast(`Loading details for ${teacherName}...`, 'info');
    
    try {
        // Get the teacher-wise data
        const response = await fetch(`${API_BASE}/reports/teacher-wise?from=${fromDate}&to=${toDate}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Find teacher in instructorWise array (not teacherWise)
            const teacher = data.instructorWise?.find(t => t.instructorName === teacherName);
            
            if (!teacher) {
                showToast('Teacher details not found', 'error');
                return;
            }
            
            // Also find all classes this teacher teaches
            const teacherClasses = [];
            data.classInstructorBreakdown?.forEach(classItem => {
                classItem.instructors.forEach(instructor => {
                    if (instructor.instructorName === teacherName) {
                        teacherClasses.push({
                            className: classItem.className,
                            students: instructor.studentCount || 0,
                            collection: instructor.collection || 0,
                            share: classItem.totalClassCollection > 0 
                                ? ((instructor.collection / classItem.totalClassCollection) * 100).toFixed(1) 
                                : 0
                        });
                    }
                });
            });
            
            showTeacherDetailsModal(teacher, teacherClasses, fromDate, toDate);
        }
    } catch (error) {
        console.error('Error fetching teacher details:', error);
        showToast('Failed to load teacher details', 'error');
    }
}

function showTeacherDetailsModal(teacher, teacherClasses, fromDate, toDate) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('teacherDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'teacherDetailsModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">
                        <i class="fas fa-chalkboard-teacher"></i> <span id="teacherDetailName"></span>
                    </h2>
                    <button onclick="closeTeacherDetailsModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #7f8c8d;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="teacherDetailContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('teacherDetailName').textContent = teacher.teacherName;
    
    let html = `
        <p style="color: #7f8c8d; margin-bottom: 20px;">
            <i class="fas fa-calendar-alt"></i> ${fromDate} to ${toDate}
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #2c3e50;">${teacher.classes?.length || 0}</div>
                <div style="color: #7f8c8d;">Classes Taught</div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">₹${(teacher.totalCollection || 0).toLocaleString()}</div>
                <div style="color: #7f8c8d;">Total Collection</div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #2980b9;">${teacher.studentCount || 0}</div>
                <div style="color: #7f8c8d;">Total Students</div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #e67e22;">${teacher.paymentCount || 0}</div>
                <div style="color: #7f8c8d;">Total Payments</div>
            </div>
        </div>
        
        <h5 style="color: #34495e; margin: 20px 0 10px 0;">Class-wise Breakdown</h5>
    `;
    
    if (teacherClasses.length > 0) {
        html += `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #2c3e50; color: white;">
                            <th style="padding: 10px; text-align: left;">Class</th>
                            <th style="padding: 10px; text-align: right;">Students</th>
                            <th style="padding: 10px; text-align: right;">Collection</th>
                            <th style="padding: 10px; text-align: right;">Share %</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        teacherClasses.forEach(classDetail => {
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${classDetail.className}</td>
                    <td style="padding: 10px; text-align: right;">${classDetail.students}</td>
                    <td style="padding: 10px; text-align: right; color: #27ae60;">₹${classDetail.collection.toLocaleString()}</td>
                    <td style="padding: 10px; text-align: right;">
                        <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 12px;">
                            ${classDetail.share}%
                        </span>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else {
        html += `<p style="color: #7f8c8d; text-align: center;">No class details available</p>`;
    }
    
    // Show recent payments if available
    if (teacher.classDetails && teacher.classDetails.length > 0) {
        html += `
            <h5 style="color: #34495e; margin: 20px 0 10px 0;">Recent Payments by Class</h5>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #2c3e50; color: white;">
                            <th style="padding: 10px; text-align: left;">Class</th>
                            <th style="padding: 10px; text-align: right;">Collection</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        teacher.classDetails.forEach(classDetail => {
            if (classDetail.collection > 0) {
                html += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px;">${classDetail.className}</td>
                        <td style="padding: 10px; text-align: right; color: #27ae60;">₹${classDetail.collection.toLocaleString()}</td>
                    </tr>
                `;
            }
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += `
        <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeTeacherDetailsModal()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;
    
    document.getElementById('teacherDetailContent').innerHTML = html;
    modal.style.display = 'flex';
}

function closeTeacherDetailsModal() {
    const modal = document.getElementById('teacherDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function exportTeacherReport() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    
    if (!fromDate || !toDate) {
        showToast('Please select date range first', 'error');
        return;
    }
    
    showToast('Exporting teacher report...', 'info');
    
    try {
        // First get the detailed data to create a comprehensive CSV
        const response = await fetch(`${API_BASE}/reports/teacher-wise?from=${fromDate}&to=${toDate}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Teacher-wise data for export:', data);
        
        if (data.success) {
            // Create CSV with instructor breakdown
            let csv = '';
            
            // Section 1: Class-Instructor Breakdown
            csv += 'CLASS-INSTRUCTOR BREAKDOWN\n';
            csv += 'Class,Instructor,Students,Payments,Collection (₹),Share %\n';
            
            data.classInstructorBreakdown.forEach(classItem => {
                const classTotal = classItem.totalClassCollection || 0;
                
                classItem.instructors.forEach(instructor => {
                    const collection = instructor.collection || 0;
                    const percentage = classTotal > 0 ? ((collection / classTotal) * 100).toFixed(1) : 0;
                    
                    csv += `${classItem.className},${instructor.instructorName},${instructor.studentCount || 0},${instructor.paymentCount || 0},${collection},${percentage}%\n`;
                });
                
                // Add class total
                csv += `${classItem.className} (TOTAL),All Instructors,${classItem.totalClassStudents || 0},${classItem.instructors.reduce((sum, i) => sum + (i.paymentCount || 0), 0)},${classTotal},100%\n\n`;
            });
            
            // Section 2: Instructor Summary
            csv += '\nINSTRUCTOR SUMMARY\n';
            csv += 'Instructor,Classes,Students,Payments,Collection (₹),Average per Payment (₹)\n';
            
            data.instructorWise.forEach(instructor => {
                const avgPerPayment = instructor.paymentCount > 0 
                    ? (instructor.totalCollection / instructor.paymentCount).toFixed(2) 
                    : 0;
                
                csv += `${instructor.instructorName},"${instructor.classes.join('; ')}",${instructor.studentCount || 0},${instructor.paymentCount || 0},${instructor.totalCollection || 0},${avgPerPayment}\n`;
                
                // Add class details for this instructor
                if (instructor.classDetails && instructor.classDetails.length > 0) {
                    instructor.classDetails.forEach(detail => {
                        if (detail.collection > 0 || detail.studentCount > 0) {
                            csv += `  - ${detail.className},,${detail.studentCount || 0},${detail.paymentCount || 0},${detail.collection || 0},\n`;
                        }
                    });
                }
            });
            
            // Section 3: Totals
            csv += '\nSUMMARY TOTALS\n';
            csv += `Total Instructors,${data.summary.totalInstructors || 0}\n`;
            csv += `Total Collection,₹${(data.summary.totalCollection || 0).toLocaleString()}\n`;
            csv += `Total Students,${data.summary.totalStudents || 0}\n`;
            csv += `Total Payments,${data.summary.totalPayments || 0}\n`;
            csv += `Period,${fromDate} to ${toDate}\n`;
            csv += `Generated on,${new Date().toLocaleString()}\n`;
            
            // Download the CSV
            downloadCSV(csv, `teacher_report_${fromDate}_to_${toDate}.csv`);
            showToast('Teacher report exported successfully!');
        } else {
            showToast(data.message || 'Failed to export report', 'error');
        }
    } catch (error) {
        console.error('Error exporting teacher report:', error);
        
        // Fallback to the export endpoint if available
        try {
            showToast('Trying alternative export method...', 'info');
            const fallbackResponse = await fetch(`${API_BASE}/reports/export/teacher-wise?from=${fromDate}&to=${toDate}`);
            
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.success && fallbackData.csv) {
                    downloadCSV(fallbackData.csv, `teacher_report_${fromDate}_to_${toDate}.csv`);
                    showToast('Teacher report exported successfully!');
                    return;
                }
            }
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
        }
        
        showToast('Failed to export teacher report: ' + error.message, 'error');
    }
}

// Quick fix for classwise export
async function downloadClasswiseReport() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const classFilter = document.getElementById('reportClassFilter')?.value || '';
    
    if (!fromDate || !toDate) {
        showToast('Please select date range first', 'error');
        return;
    }
    
    showToast('Generating classwise report...', 'info');
    
    try {
        // Try multiple possible endpoints
        const endpoints = [
            `${API_BASE}/reports/export/classwise?from=${fromDate}&to=${toDate}`,
            `${API_BASE}/reports/export/class-wise?from=${fromDate}&to=${toDate}`,
            `${API_BASE}/reports/export/classWise?from=${fromDate}&to=${toDate}`
        ];
        
        if (classFilter) {
            endpoints.forEach((url, index) => {
                endpoints[index] = url + `&className=${encodeURIComponent(classFilter)}`;
            });
        }
        
        let success = false;
        let lastError = '';
        
        for (const url of endpoints) {
            try {
                console.log('Trying endpoint:', url);
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.csv) {
                        downloadCSV(data.csv, `classwise_report_${fromDate}_to_${toDate}.csv`);
                        showToast('Classwise report downloaded successfully!');
                        success = true;
                        break;
                    }
                }
            } catch (e) {
                lastError = e.message;
                console.warn('Endpoint failed:', url, e.message);
            }
        }
        
        if (!success) {
            // If all endpoints fail, generate a simple classwise report from the summary data
            showToast('Generating classwise report from summary data...', 'info');
            
            const summaryResponse = await fetch(`${API_BASE}/reports/summary?from=${fromDate}&to=${toDate}${classFilter ? `&className=${encodeURIComponent(classFilter)}` : ''}`);
            const summaryData = await summaryResponse.json();
            
            if (summaryData.success) {
                let csv = 'Class,Total Students,Active Students,Paid Students,Total Monthly Fee\n';
                
                summaryData.classWise.forEach(cls => {
                    csv += `${cls._id || 'Unknown'},${cls.studentCount || 0},${cls.activeCount || 0},${cls.paidCount || 0},₹${cls.totalMonthlyFee || 0}\n`;
                });
                
                csv += `\nReport Period,${fromDate} to ${toDate}\n`;
                csv += `Generated on,${new Date().toLocaleString()}\n`;
                
                downloadCSV(csv, `classwise_report_${fromDate}_to_${toDate}.csv`);
                showToast('Classwise report generated from summary!');
            } else {
                throw new Error('Could not generate classwise report');
            }
        }
    } catch (error) {
        console.error('Error in classwise export:', error);
        showToast('Failed to export classwise report: ' + error.message, 'error');
    }
}

function printTeacherReport() {
    const reportPreview = document.getElementById('reportPreview');
    if (!reportPreview || !reportPreview.innerHTML) {
        showToast('No teacher report to print', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Please allow pop-ups to print', 'error');
        return;
    }
    
    const reportContent = reportPreview.innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Teacher-wise Report - Music School</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .report-container { max-width: 1200px; margin: 0 auto; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th { background: #2c3e50; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .summary-card { 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 8px; 
                    text-align: center;
                    display: inline-block;
                    width: 200px;
                    margin: 10px;
                }
                @media print {
                    button { display: none; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1>P.A.C. Ramasamy Raja Memorial Music School</h1>
                    <h2>Teacher-wise Collection Report</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                ${reportContent}
                <div style="margin-top: 30px; text-align: center; color: #7f8c8d;">
                    <p>This is a computer generated report</p>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Fix the downloadReport function to match your backend routes
async function downloadReport(type) {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const classFilter = document.getElementById('reportClassFilter')?.value || '';
    
    if (!fromDate || !toDate) {
        showToast('Please select date range first', 'error');
        return;
    }
    
    showToast(`Generating ${type} report...`, 'info');
    
    try {
        let url;
        
        // Map frontend report types to backend endpoint types
        switch(type) {
            case 'teacher-wise':
                // Teacher-wise has its own dedicated endpoint
                url = `${API_BASE}/reports/export/teacher-wise?from=${fromDate}&to=${toDate}`;
                break;
                
            case 'classwise':
                // For class-wise data, you need to use the main export with type='classwise'
                // But first check if your backend supports it
                showToast('Class-wise export not available. Using payment report with class filter.', 'info');
                url = `${API_BASE}/reports/export/payment?from=${fromDate}&to=${toDate}`;
                if (classFilter) {
                    url += `&className=${encodeURIComponent(classFilter)}`;
                }
                break;
                
            case 'payment':
            case 'student':
            case 'overdue':
            case 'full':
            case 'monthly':
                // These map directly to your :type parameter
                url = `${API_BASE}/reports/export/${type}?from=${fromDate}&to=${toDate}`;
                if (classFilter) {
                    url += `&className=${encodeURIComponent(classFilter)}`;
                }
                break;
                
            default:
                showToast(`Unknown report type: ${type}`, 'error');
                return;
        }
        
        console.log('Downloading from URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Download failed:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Check content type to handle different responses
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            // Handle JSON response
            const data = await response.json();
            console.log('Download response:', data);
            
            if (data.success && data.csv) {
                downloadCSV(data.csv, `${type}_report_${fromDate}_to_${toDate}.csv`);
                showToast(`${type} report downloaded successfully!`);
            } else {
                showToast(data.message || 'Failed to generate report', 'error');
            }
        } else {
            // Handle direct CSV download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_report_${fromDate}_to_${toDate}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast(`${type} report downloaded successfully!`);
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showToast('Failed to download report: ' + error.message, 'error');
    }
}

// Helper function to download CSV
function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadFullReport(fromDate, toDate, className) {
    downloadReport('full');
}

function printReport() {
    const reportPreview = document.getElementById('reportPreview');
    if (!reportPreview || !reportPreview.innerHTML) {
        showToast('No report to print', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Please allow pop-ups to print', 'error');
        return;
    }
    
    const reportContent = reportPreview.innerHTML;
    const title = document.querySelector('h2 i.fa-chart-bar')?.parentElement?.textContent || 'Music School Report';
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .report-container { max-width: 1200px; margin: 0 auto; }
                @media print {
                    button { display: none; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1>P.A.C. Ramasamy Raja Memorial Music School</h1>
                    <h2>${title}</h2>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                ${reportContent}
                <div style="margin-top: 30px; text-align: center; color: #7f8c8d;">
                    <p>This is a computer generated report</p>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ========== EXPORT FUNCTIONS ==========

// Keep your existing export functions here...
async function exportAllStudents() {
    // Your existing exportAllStudents function
    try {
        const status = document.getElementById('statusFilter')?.value || '';
        const className = document.getElementById('classFilter')?.value || '';
        const search = document.getElementById('searchInput')?.value || '';
        
        let url = `${API_BASE}/students?limit=5000`;
        if (status) url += `&status=${status}`;
        if (className) url += `&className=${encodeURIComponent(className)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        showToast('Fetching student data...', 'info');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Email,Phone,Class,Instructor,Monthly Fee (₹),Status,Payment Status,Join Date,Last Payment,Next Due,Gender,Date of Birth,Guardian Name,Guardian Phone,Batch Timing,Address,Notes\n';
            
            data.students.forEach(student => {
                const address = student.address ? 
                    `${student.address.street || ''}, ${student.address.city || ''}, ${student.address.state || ''} ${student.address.pincode || ''}`.trim() : '';
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${escapeHtml(student.name) || ''}"`,
                    `"${escapeHtml(student.email) || ''}"`,
                    `"${student.phone || ''}"`,
                    `"${student.className || ''}"`,
                    `"${student.instructor || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.status || ''}"`,
                    `"${student.paymentStatus || 'pending'}"`,
                    `"${formatDate(student.joinDate)}"`,
                    `"${formatDate(student.lastPaymentDate)}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    `"${student.gender || ''}"`,
                    `"${formatDate(student.dateOfBirth)}"`,
                    `"${escapeHtml(student.guardianName) || ''}"`,
                    `"${student.guardianPhone || ''}"`,
                    `"${student.batchTiming || ''}"`,
                    `"${address}"`,
                    `"${escapeHtml(student.notes) || ''}"`
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.href = url;
            link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            
            showToast(`Exported ${data.students.length} students successfully!`);
        } else {
            showToast('No students found to export', 'warning');
        }
    } catch (error) {
        console.error('Error exporting students:', error);
        showToast('Failed to export students', 'error');
    }
}

async function exportActiveStudents() {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = 'active';
    await exportAllStudents();
}

async function exportClassWiseStudents() {
    const classFilter = document.getElementById('classFilter')?.value || '';
    
    if (!classFilter) {
        showToast('Please select a class filter first', 'warning');
        return;
    }
    
    await exportAllStudents();
}

async function exportPendingPayments() {
    try {
        showToast('Fetching pending payments...', 'info');
        
        const response = await fetch(`${API_BASE}/payments/pending`);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Class,Instructor,Monthly Fee (₹),Phone,Email,Guardian Phone,Next Due Date,Overdue Days\n';
            
            const today = new Date();
            
            data.students.forEach(student => {
                const dueDate = student.nextPaymentDue ? new Date(student.nextPaymentDue) : null;
                const overdueDays = dueDate && dueDate < today ? 
                    Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${escapeHtml(student.name) || ''}"`,
                    `"${student.className || ''}"`,
                    `"${student.instructor || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.phone || ''}"`,
                    `"${escapeHtml(student.email) || ''}"`,
                    `"${student.guardianPhone || ''}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    overdueDays
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.href = url;
            link.setAttribute('download', `pending_payments_${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            
            showToast(`Exported ${data.students.length} pending payments`);
        } else {
            showToast('No pending payments found', 'info');
        }
    } catch (error) {
        console.error('Error exporting pending payments:', error);
        showToast('Failed to export pending payments', 'error');
    }
}

async function exportOverdueStudents() {
    try {
        showToast('Fetching overdue students...', 'info');
        
        const response = await fetch(`${API_BASE}/payments/overdue`);
        const data = await response.json();
        
        if (data.success && data.students?.length > 0) {
            let csvContent = 'Student ID,Name,Class,Monthly Fee (₹),Phone,Next Due Date,Overdue Days,Last Payment\n';
            
            const today = new Date();
            
            data.students.forEach(student => {
                const dueDate = student.nextPaymentDue ? new Date(student.nextPaymentDue) : null;
                const overdueDays = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;
                
                const row = [
                    `"${student.studentId || ''}"`,
                    `"${escapeHtml(student.name) || ''}"`,
                    `"${student.className || ''}"`,
                    student.monthlyFee || 0,
                    `"${student.phone || ''}"`,
                    `"${formatDate(student.nextPaymentDue)}"`,
                    overdueDays,
                    `"${formatDate(student.lastPaymentDate)}"`
                ].join(',');
                
                csvContent += row + '\n';
            });
            
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.href = url;
            link.setAttribute('download', `overdue_students_${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
            URL.revokeObjectURL(url);
            
            showToast(`Exported ${data.students.length} overdue students`);
        } else {
            showToast('No overdue students found', 'info');
        }
    } catch (error) {
        console.error('Error exporting overdue students:', error);
        showToast('Failed to export overdue students', 'error');
    }
}

function printStudentList() {
    // Your existing printStudentList function
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        showToast('Please allow pop-ups to print', 'error');
        return;
    }
    
    const studentRows = document.querySelectorAll('.students-table tbody tr');
    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student List - Music School</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th { background: #2c3e50; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .status-active { color: #27ae60; }
                .status-inactive { color: #7f8c8d; }
                .footer { margin-top: 20px; text-align: center; color: #7f8c8d; }
            </style>
        </head>
        <body>
            <h1>P.A.C. Ramasamy Raja Memorial Music School - Student List</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Class</th>
                        <th>Fee</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    studentRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const studentId = cells[0]?.textContent || '';
            const name = cells[1]?.textContent || '';
            const classes = cells[2]?.textContent || '';
            const fee = cells[3]?.textContent || '';
            const status = cells[4]?.textContent || '';
            
            printHTML += `
                <tr>
                    <td>${studentId}</td>
                    <td>${name}</td>
                    <td>${classes.replace(/<[^>]*>/g, '')}</td>
                    <td>${fee}</td>
                    <td>${status}</td>
                </tr>
            `;
        }
    });
    
    printHTML += `
                </tbody>
            </table>
            <div class="footer">
                <p>Total Students: ${studentRows.length}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.print();
}

// Helper functions
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
}

// Quick date range functions
function setDateRange(range) {
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();
    
    switch(range) {
        case 'today':
            fromDate = today;
            toDate = today;
            break;
            
        case 'week':
            // Start of week (Sunday)
            fromDate.setDate(today.getDate() - today.getDay());
            toDate = new Date(fromDate);
            toDate.setDate(fromDate.getDate() + 6);
            break;
            
        case 'month':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
            
        case 'lastMonth':
            fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            toDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
            
        case 'year':
            fromDate = new Date(today.getFullYear(), 0, 1);
            toDate = new Date(today.getFullYear(), 11, 31);
            break;
    }
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('fromDate').value = formatDate(fromDate);
    document.getElementById('toDate').value = formatDate(toDate);
    
    // Auto-generate report
    generateReport();
}

// Make report functions globally available
window.initReportsTab = initReportsTab;
window.generateReport = generateReport;
window.downloadReport = downloadReport;
window.downloadFullReport = downloadFullReport;
window.exportAllStudents = exportAllStudents;
window.exportActiveStudents = exportActiveStudents;
window.exportClassWiseStudents = exportClassWiseStudents;
window.exportPendingPayments = exportPendingPayments;
window.exportOverdueStudents = exportOverdueStudents;
window.printStudentList = printStudentList;
window.printReport = printReport;
window.generateTeacherWiseReport = generateTeacherWiseReport;
window.viewTeacherDetails = viewTeacherDetails;
window.exportTeacherReport = exportTeacherReport;
window.printTeacherReport = printTeacherReport;
window.closeTeacherDetailsModal = closeTeacherDetailsModal;
window.setDateRange = setDateRange;