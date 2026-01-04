// App State
const AppState = {
    currentStep: 1,
    userId: null,
    userData: null,
    phoneNumber: null,
    selectedCandidate: null,
    otpTimer: null,
    otpTimeLeft: 120
};

// DOM Elements
const modal = document.getElementById('votingModal');
const modalSections = document.querySelectorAll('.modal-section');
const progressSteps = document.querySelectorAll('.progress-step');
const progressFill = document.getElementById('progress-fill');
const loadingOverlay = document.getElementById('loading');
const toast = document.getElementById('toast');
const otpDigits = document.querySelectorAll('.otp-digit');
const otpComplete = document.getElementById('otp-complete');

// API Configuration
// At the top of script.js, replace API_BASE_URL with:
const API_BASE_URL = window.CONFIG.API_BASE_URL;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initScrollAnimations();
    initLiveStats();
    initOTPInputs();
    initCamera();
    setupEventListeners();
    
    // Add some demo data updates
    updateLiveStats();
    setInterval(updateLiveStats, 5000);
});

// Initialize scroll animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// Initialize live statistics
function initLiveStats() {
    // Initial values
    updateCounter('liveVoters', 2847, 3000, 100);
    updateCounter('totalVotes', 12458, 13000, 50);
    updateCounter('verifiedToday', 847, 900, 100);
}

function updateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

function updateLiveStats() {
    // Simulate live updates
    const voters = document.getElementById('liveVoters');
    const votes = document.getElementById('totalVotes');
    const verified = document.getElementById('verifiedToday');
    const hours = document.getElementById('hoursRemaining');
    
    if (voters) {
        const current = parseInt(voters.textContent.replace(/,/g, ''));
        const change = Math.floor(Math.random() * 20) - 5;
        const newValue = Math.max(2800, current + change);
        voters.textContent = newValue.toLocaleString();
    }
    
    if (votes) {
        const current = parseInt(votes.textContent.replace(/,/g, ''));
        const change = Math.floor(Math.random() * 100);
        votes.textContent = (current + change).toLocaleString();
    }
    
    if (verified) {
        const current = parseInt(verified.textContent.replace(/,/g, ''));
        const change = Math.floor(Math.random() * 10);
        verified.textContent = (current + change).toLocaleString();
    }
    
    if (hours) {
        const current = parseInt(hours.textContent);
        if (current > 0) {
            hours.textContent = current - 1;
        }
    }
}

// Initialize OTP inputs
function initOTPInputs() {
    otpDigits.forEach((digit, index) => {
        digit.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < otpDigits.length - 1) {
                otpDigits[index + 1].focus();
            }
            updateCompleteOTP();
        });
        
        digit.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !digit.value && index > 0) {
                otpDigits[index - 1].focus();
            }
        });
    });
}

function updateCompleteOTP() {
    const otp = Array.from(otpDigits).map(digit => digit.value).join('');
    otpComplete.value = otp;
}

// Initialize camera
async function initCamera() {
    try {
        const video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640,
                height: 480,
                facingMode: 'user'
            } 
        });
        video.srcObject = stream;
    } catch (error) {
        console.log('Camera access not available, using fallback');
        showToast('Camera not available. Using simulated verification.', 'info');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Registration form
    document.getElementById('registration-form').addEventListener('submit', handleRegistration);
    
    // OTP form
    document.getElementById('otp-form').addEventListener('submit', handleOTPVerification);
    document.getElementById('resend-otp').addEventListener('click', handleResendOTP);
    
    // Face verification
    document.getElementById('capture-btn').addEventListener('click', captureFace);
    document.getElementById('retake-btn').addEventListener('click', retakePhoto);
    document.getElementById('skip-face').addEventListener('click', skipFaceVerification);
    
    // Voting
    document.getElementById('view-status').addEventListener('click', viewVotingStatus);
    
    // Modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('confirm-vote').addEventListener('click', confirmVote);
    document.getElementById('cancel-vote').addEventListener('click', cancelVote);
    
    // Navigation
    document.querySelector('.mobile-toggle').addEventListener('click', toggleMobileMenu);
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show modal
function openRegistration() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showStep(1);
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetForm();
}

// Reset form
function resetForm() {
    AppState.currentStep = 1;
    AppState.userId = null;
    AppState.userData = null;
    AppState.phoneNumber = null;
    AppState.selectedCandidate = null;
    
    // Clear inputs
    document.getElementById('registration-form').reset();
    otpDigits.forEach(digit => digit.value = '');
    document.getElementById('captured-photo').src = '';
    document.getElementById('captured-photo-container').style.display = 'none';
    
    // Reset verification
    document.getElementById('verification-loader').classList.remove('active');
    document.getElementById('verification-success').classList.remove('active');
    
    // Hide vote success
    document.getElementById('vote-success').classList.remove('active');
    document.getElementById('vote-confirmation').classList.remove('active');
    
    showStep(1);
}

// Show specific step
function showStep(stepNumber) {
    AppState.currentStep = stepNumber;
    
    // Hide all sections
    modalSections.forEach(section => section.classList.remove('active'));
    
    // Show current section
    const currentSection = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentSection) {
        currentSection.parentElement.classList.add('active');
    }
    
    // Update progress steps
    progressSteps.forEach((step, index) => {
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Update progress bar
    progressFill.style.width = `${(stepNumber - 1) * 33.33}%`;
    
    // Handle step-specific initializations
    switch(stepNumber) {
        case 2:
            startOTPTimer();
            break;
        case 3:
            if (AppState.userId) {
                loadUserData();
            }
            break;
        case 4:
            if (AppState.userId) {
                loadCandidates();
            }
            break;
    }
}

// Start OTP timer
function startOTPTimer() {
    if (AppState.otpTimer) {
        clearInterval(AppState.otpTimer);
    }
    
    AppState.otpTimeLeft = 120;
    updateOTPTimer();
    
    AppState.otpTimer = setInterval(() => {
        AppState.otpTimeLeft--;
        updateOTPTimer();
        
        if (AppState.otpTimeLeft <= 0) {
            clearInterval(AppState.otpTimer);
            showToast('OTP expired. Please request a new one.', 'warning');
        }
    }, 1000);
}

function updateOTPTimer() {
    const minutes = Math.floor(AppState.otpTimeLeft / 60);
    const seconds = AppState.otpTimeLeft % 60;
    const timerElement = document.getElementById('otp-timer');
    if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Handle registration
async function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const location = document.getElementById('location').value;
    const aadhaar = document.getElementById('aadhaar').value.trim();
    
    // Validation
    if (!name || !phone || !location || !aadhaar) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) {
        showToast('Please enter a valid 12-digit Aadhaar number', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, location, aadhaar })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            AppState.phoneNumber = phone;
            showStep(2);
            document.getElementById('phone-display').textContent = `OTP sent to +91 ${phone}`;
            showToast('OTP sent to your mobile number', 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle OTP verification
async function handleOTPVerification(e) {
    e.preventDefault();
    
    const otp = otpComplete.value;
    
    if (!otp || otp.length !== 6) {
        showToast('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone: AppState.phoneNumber, 
                otp: otp 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            AppState.userId = data.userId;
            clearInterval(AppState.otpTimer);
            showStep(3);
            showToast('Mobile verification successful', 'success');
        } else {
            showToast(data.error || 'Invalid OTP', 'error');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle OTP resend
function handleResendOTP() {
    showLoading(true);
    
    // Simulate API call
    setTimeout(() => {
        showLoading(false);
        AppState.otpTimeLeft = 120;
        startOTPTimer();
        showToast('New OTP sent to your mobile number', 'success');
    }, 1000);
}

// Capture face
function captureFace() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const capturedPhoto = document.getElementById('captured-photo');
    
    if (!video.srcObject) {
        skipFaceVerification();
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg');
    capturedPhoto.src = photoData;
    
    document.getElementById('captured-photo-container').style.display = 'block';
    document.getElementById('verification-loader').classList.add('active');
    
    // Simulate face verification
    setTimeout(() => {
        document.getElementById('verification-loader').classList.remove('active');
        document.getElementById('verification-success').classList.add('active');
        
        // Stop camera stream
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        showToast('Face verification successful', 'success');
    }, 2000);
}

// Retake photo
function retakePhoto() {
    document.getElementById('captured-photo-container').style.display = 'none';
    document.getElementById('verification-success').classList.remove('active');
    initCamera();
}

// Skip face verification
function skipFaceVerification() {
    showStep(4);
    showToast('Face verification skipped for demo', 'info');
}

// Load user data
async function loadUserData() {
    if (!AppState.userId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/${AppState.userId}`);
        const data = await response.json();
        
        if (response.ok && data.user) {
            AppState.userData = data.user;
            document.getElementById('voter-name').textContent = data.user.name;
            document.getElementById('voter-location').textContent = data.user.location;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load candidates
async function loadCandidates() {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates`);
        const data = await response.json();
        
        if (response.ok && data.candidates) {
            displayCandidates(data.candidates);
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
        // Fallback data
        const fallbackCandidates = [
            { id: 1, name: 'Rahul Sharma', party: 'National Progressive Party', symbol: 'Lotus' },
            { id: 2, name: 'Priya Patel', party: 'Democratic Alliance', symbol: 'Hand' },
            { id: 3, name: 'Amit Kumar', party: 'People\'s Welfare Party', symbol: 'Clock' },
            { id: 4, name: 'Sunita Reddy', party: 'Unity Front', symbol: 'Elephant' }
        ];
        displayCandidates(fallbackCandidates);
    }
}

// Display candidates
function displayCandidates(candidates) {
    const container = document.getElementById('candidates-list');
    container.innerHTML = '';
    
    const colors = ['#4A6FA5', '#FF6B6B', '#4ECDC4', '#FFD166'];
    const icons = ['fas fa-spa', 'fas fa-hand-peace', 'fas fa-clock', 'fas fa-paw'];
    
    candidates.forEach((candidate, index) => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.innerHTML = `
            <div class="candidate-avatar" style="background: ${colors[index]}">
                <i class="${icons[index]}"></i>
            </div>
            <div class="candidate-info">
                <h4>${candidate.name}</h4>
                <p>${candidate.party}</p>
                <p><i class="fas fa-landmark"></i> Symbol: ${candidate.symbol}</p>
                <button class="vote-button" onclick="selectCandidate(${candidate.id}, '${candidate.name}')">
                    <i class="fas fa-vote-yea"></i> Vote for ${candidate.name.split(' ')[0]}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Select candidate
function selectCandidate(candidateId, candidateName) {
    AppState.selectedCandidate = { id: candidateId, name: candidateName };
    
    // Highlight selected candidate
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Show confirmation
    document.getElementById('selected-candidate-name').textContent = candidateName;
    document.getElementById('vote-confirmation').classList.add('active');
}

// Confirm vote
async function confirmVote() {
    if (!AppState.userId || !AppState.selectedCandidate) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: AppState.userId,
                candidateId: AppState.selectedCandidate.id
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            document.getElementById('vote-confirmation').classList.remove('active');
            document.getElementById('vote-success').classList.add('active');
            
            // Update vote ID and time
            document.getElementById('vote-id').textContent = data.voteId || `VS-${Date.now()}`;
            document.getElementById('vote-time').textContent = new Date().toLocaleTimeString();
            
            showToast('Your vote has been recorded successfully!', 'success');
            
            // Update live stats
            updateLiveStats();
        } else {
            showToast(data.error || 'Vote failed', 'error');
        }
    } catch (error) {
        console.error('Vote error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Cancel vote
function cancelVote() {
    document.getElementById('vote-confirmation').classList.remove('active');
    AppState.selectedCandidate = null;
}

// View voting status
function viewVotingStatus() {
    if (AppState.userData) {
        const status = AppState.userData.hasVoted ? 'You have already voted.' : 'You have not voted yet.';
        alert(`Voting Status:\n\nName: ${AppState.userData.name}\nLocation: ${AppState.userData.location}\nStatus: ${status}`);
    } else {
        alert('Voting status information is not available.');
    }
}

// Show loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    switch(type) {
        case 'success':
            toastIcon.className = 'fas fa-check-circle toast-icon';
            toastIcon.style.color = '#4cc9f0';
            break;
        case 'error':
            toastIcon.className = 'fas fa-exclamation-circle toast-icon';
            toastIcon.style.color = '#f72585';
            break;
        case 'warning':
            toastIcon.className = 'fas fa-exclamation-triangle toast-icon';
            toastIcon.style.color = '#f8961e';
            break;
        case 'info':
            toastIcon.className = 'fas fa-info-circle toast-icon';
            toastIcon.style.color = '#4361ee';
            break;
    }
    
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(hideToast, 5000);
}

// Hide toast
function hideToast() {
    toast.style.display = 'none';
}

// Add smooth scrolling to navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});