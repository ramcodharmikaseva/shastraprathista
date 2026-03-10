// ========== CONFIGURATION ==========
const API_BASE = `${window.location.origin}/api/music`;

// ========== LOAD CLASSES FROM BACKEND ==========
async function loadMusicClasses() {
    console.log('Loading music classes from backend...');
    
    const classesContainer = document.querySelector('.classes-container');
    if (!classesContainer) return;
    
    // Show loading state
    classesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Loading classes...</p></div>';
    
    try {
        // Fetch class configurations
        const response = await fetch(`${API_BASE}/class-configurations`);
        const data = await response.json();
        
        console.log('Class configurations:', data);
        
        let configurations = [];
        if (data.success && Array.isArray(data.configurations)) {
            configurations = data.configurations;
        }
        
        if (configurations.length === 0) {
            classesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">No classes available at the moment.</div>';
            return;
        }
        
        // Get GST percentage for calculations
        const gstPercentage = await getGSTPercentage();
        
        // Build HTML for each class
        let html = '';
        configurations.forEach(config => {
            if (!config.active) return; // Skip inactive classes
            
            const className = config.className || '';
            const teacherName = config.teacherName || 'Expert Instructor';
            const baseFee = config.baseFee || 0;
            
            // Calculate GST and total
            const gstAmount = (baseFee * gstPercentage / 100).toFixed(2);
            const totalFee = (baseFee + parseFloat(gstAmount)).toFixed(2);
            
            // Determine class image class
            let imageClass = '';
            let icon = '';
            
            const classLower = className.toLowerCase();
            if (classLower.includes('vocal')) {
                imageClass = 'vocal';
                icon = 'fa-microphone';
            } else if (classLower.includes('veena')) {
                imageClass = 'veena';
                icon = 'fa-guitar';
            } else if (classLower.includes('violin')) {
                imageClass = 'violin';
                icon = 'fa-violin';
            } else if (classLower.includes('mridangam') || classLower.includes('mridangam') || classLower.includes('mridangam')) {
                imageClass = 'mridangam';
                icon = 'fa-drum';
            } else if (classLower.includes('keyboard')) {
                imageClass = 'keyboard';
                icon = 'fa-keyboard';
            } else if (classLower.includes('bharatanatyam') || classLower.includes('dance')) {
                imageClass = 'bharatanatyam';
                icon = 'fa-user-ninja';
            } else {
                imageClass = 'vocal'; // Default
                icon = 'fa-music';
            }
            
            // Create class description
            let description = '';
            if (classLower.includes('vocal')) {
                description = 'Learn the ancient art of Carnatic vocal music with our expert instructors.';
            } else if (classLower.includes('veena')) {
                description = 'Master the divine instrument of Goddess Saraswati.';
            } else if (classLower.includes('violin')) {
                description = 'Learn both Western classical and Carnatic violin techniques.';
            } else if (classLower.includes('mridangam') || classLower.includes('mridangam') || classLower.includes('mridhangam')) {
                description = 'Learn the traditional percussion instrument that forms the foundation of Carnatic music.';
            } else if (classLower.includes('keyboard')) {
                description = 'Learn Western and Carnatic music on keyboard.';
            } else if (classLower.includes('bharatanatyam')) {
                description = 'Learn the classical Indian dance form that combines rhythm, expression, and spirituality.';
            } else {
                description = `Learn ${className} with our expert instructors.`;
            }
            
            html += `
                <div class="class-card" data-class="${className}" data-fee="${baseFee}" data-teacher="${teacherName}">
                    <div class="class-image ${imageClass}">
                        <i class="fas ${icon} fa-4x" style="color: white;"></i>
                    </div>
                    <div class="class-info">
                        <h3>${escapeHtml(className)} Classes</h3>
                        <p><strong>Instructor:</strong> ${escapeHtml(teacherName)}</p>
                        <p>${description}</p>
                        
                        <div class="class-details">
                            <div class="detail-item">
                                <i class="fas fa-rupee-sign"></i>
                                <span>₹${baseFee}/month</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-percent"></i>
                                <span>GST: ₹${gstAmount}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-calculator"></i>
                                <span>Total: ₹${totalFee}</span>
                            </div>
                        </div>
                        
                        <div class="class-actions">
                            <button class="btn btn-pay" onclick="payFees('${escapeHtml(className)}', ${baseFee})">
                                <i class="fas fa-rupee-sign"></i> Pay Fees
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        classesContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading classes:', error);
        classesContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #e74c3c;"><i class="fas fa-exclamation-circle fa-3x"></i><p>Failed to load classes. Please try again later.</p></div>';
    }
}

// ========== LOAD INSTRUCTORS FROM BACKEND ==========
async function loadInstructors() {
    console.log('Loading instructors from backend...');
    
    const instructorsGrid = document.querySelector('.instructors-grid');
    if (!instructorsGrid) return;
    
    try {
        // Fetch teachers
        const response = await fetch(`${API_BASE}/teachers`);
        const data = await response.json();
        
        console.log('Teachers:', data);
        
        let teachers = [];
        if (data.success && Array.isArray(data.teachers)) {
            teachers = data.teachers;
        } else if (data.success && Array.isArray(data.data)) {
            teachers = data.data;
        }
        
        if (teachers.length === 0) {
            // Keep existing hardcoded instructors if no data
            return;
        }
        
        // Build HTML for instructors
        let html = '';
        teachers.forEach(teacher => {
            // Determine icon based on classes taught
            let icon = 'fa-chalkboard-teacher';
            if (teacher.classes) {
                const classes = Array.isArray(teacher.classes) ? teacher.classes : [];
                if (classes.some(c => c.toLowerCase().includes('vocal'))) {
                    icon = 'fa-microphone';
                } else if (classes.some(c => c.toLowerCase().includes('veena'))) {
                    icon = 'fa-guitar';
                } else if (classes.some(c => c.toLowerCase().includes('violin'))) {
                    icon = 'fa-violin';
                } else if (classes.some(c => c.toLowerCase().includes('mridangam'))) {
                    icon = 'fa-drum';
                } else if (classes.some(c => c.toLowerCase().includes('keyboard'))) {
                    icon = 'fa-keyboard';
                } else if (classes.some(c => c.toLowerCase().includes('bharatanatyam'))) {
                    icon = 'fa-user-ninja';
                }
            }
            
            const classesList = Array.isArray(teacher.classes) ? teacher.classes.join(' • ') : '';
            
            html += `
                <div class="instructor-card">
                    <div class="instructor-image">
                        <i class="fas ${icon} fa-3x"></i>
                    </div>
                    <div class="instructor-info">
                        <h3>${escapeHtml(teacher.name)}</h3>
                        <p>${escapeHtml(classesList || 'Music Instructor')}</p>
                        <div class="instructor-social">
                            <a href="#"><i class="fab fa-facebook"></i></a>
                            <a href="#"><i class="fab fa-instagram"></i></a>
                            <a href="#"><i class="fab fa-youtube"></i></a>
                        </div>
                    </div>
                </div>
            `;
        });
        
        instructorsGrid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading instructors:', error);
        // Keep existing hardcoded instructors
    }
}

// ========== HELPER FUNCTIONS ==========

// Get GST percentage
async function getGSTPercentage() {
    try {
        const response = await fetch(`${API_BASE}/gst-settings`);
        const data = await response.json();
        return data.gstPercentage || 18;
    } catch (error) {
        console.error('Error fetching GST:', error);
        return 18;
    }
}

// Escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Pay fees - redirect to payment page
function payFees(className, fee) {
    window.location.href = `music-payment.html?class=${encodeURIComponent(className)}&fee=${fee}`;
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Music page loaded - loading dynamic data');
    
    // Load classes from backend
    loadMusicClasses();
    
    // Load instructors from backend
    loadInstructors();
    
    // Update hero section with class names
    setTimeout(() => {
        updateHeroSlides();
    }, 500);
});

// Update hero slides with actual class names
async function updateHeroSlides() {
    try {
        const response = await fetch(`${API_BASE}/class-configurations`);
        const data = await response.json();
        
        let configurations = [];
        if (data.success && Array.isArray(data.configurations)) {
            configurations = data.configurations.filter(c => c.active);
        }
        
        if (configurations.length === 0) return;
        
        const slides = document.querySelectorAll('.hero-slide');
        const indicators = document.querySelectorAll('.hero-indicator');
        
        // Update slide content with actual class names
        configurations.forEach((config, index) => {
            if (slides[index]) {
                const className = config.className || '';
                const slide = slides[index];
                
                // Update heading
                const heading = slide.querySelector('h1');
                if (heading) {
                    heading.textContent = `${className} Classes`;
                }
                
                // Update paragraph based on class type
                const paragraph = slide.querySelector('p');
                if (paragraph) {
                    const classLower = className.toLowerCase();
                    if (classLower.includes('vocal')) {
                        paragraph.textContent = 'Master the art of traditional Carnatic singing with expert guidance';
                    } else if (classLower.includes('veena')) {
                        paragraph.textContent = 'Learn the divine instrument of Goddess Saraswati';
                    } else if (classLower.includes('violin')) {
                        paragraph.textContent = 'Carnatic violin training';
                    } else if (classLower.includes('mridangam') || classLower.includes('mridangam')) {
                        paragraph.textContent = 'Master the traditional percussion instrument';
                    } else if (classLower.includes('keyboard')) {
                        paragraph.textContent = 'Learn Carnatic music on keyboard';
                    } else if (classLower.includes('bharatanatyam')) {
                        paragraph.textContent = 'Classical Indian dance form with spiritual essence';
                    } else {
                        paragraph.textContent = `Learn ${className} with our expert instructors`;
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating hero slides:', error);
    }
}