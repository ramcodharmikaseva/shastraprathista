// ========== EMERGENCY FIXES FOR ALL BUTTONS ==========

// Ensure all modal close functions are available
window.closeEditClassModal = window.closeEditClassModal || function() {
    console.log('closeEditClassModal called');
    const modal = document.getElementById('editClassModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.closeEditTeacherModal = window.closeEditTeacherModal || function() {
    console.log('closeEditTeacherModal called');
    const modal = document.getElementById('editTeacherModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.closeModal = window.closeModal || function() {
    console.log('closeModal called');
    const modal = document.getElementById('studentModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Ensure addClassRow is available
window.addClassRow = window.addClassRow || function() {
    console.log('addClassRow called (fallback)');
    const container = document.getElementById('classesContainer');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'class-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.5fr auto; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    row.innerHTML = `
        <select class="className" onchange="window.updateClassFee(this)" required>
            <option value="">Select Class</option>
            <option value="Carnatic Vocal" data-fee="250">Carnatic Vocal</option>
            <option value="Veena" data-fee="280">Veena</option>
            <option value="Violin" data-fee="250">Violin</option>
            <option value="Mridangam" data-fee="300">Mridangam</option>
            <option value="Keyboard" data-fee="450">Keyboard</option>
            <option value="Bharatanatyam" data-fee="300">Bharatanatyam</option>
        </select>
        <select class="instructor">
            <option value="">Select Instructor</option>
            <option value="Not Assigned">Not Assigned</option>
        </select>
        <input type="number" class="monthlyFee" placeholder="Fee" readonly style="background:#f0f0f0;">
        <input type="text" class="batchTiming" placeholder="Batch Timing">
        <button type="button" onclick="window.removeClassRow(this)" class="btn" style="background:#e74c3c;color:white; padding:8px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
    if (typeof window.updateTotalFee === 'function') {
        window.updateTotalFee();
    } else {
        // Simple total update
        let total = 0;
        document.querySelectorAll('#classesContainer .class-row .monthlyFee').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        const totalDisplay = document.getElementById('totalMonthlyFee');
        if (totalDisplay) totalDisplay.textContent = total;
    }
};

// Ensure removeClassRow is available
window.removeClassRow = window.removeClassRow || function(btn) {
    console.log('removeClassRow called (fallback)');
    const row = btn.closest('.class-row');
    const container = document.getElementById('classesContainer');
    if (container && container.children.length > 1) {
        row.remove();
        // Update total
        let total = 0;
        document.querySelectorAll('#classesContainer .class-row .monthlyFee').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        const totalDisplay = document.getElementById('totalMonthlyFee');
        if (totalDisplay) totalDisplay.textContent = total;
    } else {
        alert('At least one class is required');
    }
};

// Ensure updateClassFee is available
window.updateClassFee = window.updateClassFee || function(select) {
    console.log('updateClassFee called (fallback)');
    const selectedOption = select.options[select.selectedIndex];
    const fee = selectedOption.getAttribute('data-fee') || 0;
    const row = select.closest('.class-row');
    const feeInput = row.querySelector('.monthlyFee');
    
    if (feeInput) {
        feeInput.value = fee;
    }
    
    // Update total
    let total = 0;
    document.querySelectorAll('#classesContainer .class-row .monthlyFee').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const totalDisplay = document.getElementById('totalMonthlyFee');
    if (totalDisplay) totalDisplay.textContent = total;
};

// Ensure updateTotalFee is available
window.updateTotalFee = window.updateTotalFee || function() {
    console.log('updateTotalFee called (fallback)');
    let total = 0;
    document.querySelectorAll('#classesContainer .class-row .monthlyFee').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const totalDisplay = document.getElementById('totalMonthlyFee');
    if (totalDisplay) {
        totalDisplay.textContent = total;
    }
};

// Log that fixes are loaded
console.log('✅ Emergency fixes loaded');
console.log('✅ closeEditClassModal available:', typeof window.closeEditClassModal === 'function');
console.log('✅ addClassRow available:', typeof window.addClassRow === 'function');