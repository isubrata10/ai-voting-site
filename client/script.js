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

// Debug: Check if elements exist
console.log('Modal element:', modal);
console.log('Toast element:', toast);

// API Configuration
const config = {
    API_BASE_URL: 'https://api.securevote.com/v1'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing app');
    
    // First, make functions globally available
    window.openRegistration = openRegistration;
    window.closeModal = closeModal;
    window.scrollToSection = scrollToSection;
    window.selectCandidate = selectCandidate;
    window.viewVotingStatus = viewVotingStatus;
    window.hideToast = hideToast;
    
    // Then initialize everything
    initScrollAnimations();
    initLiveStats();
    initOTPInputs();
    initCamera();
    setupEventListeners();
    
    updateLiveStats();
    setInterval(updateLiveStats, 5000);
    
    // Initialize toast
    const toastClose = toast?.querySelector('.toast-close');
    if (toastClose) {
        toastClose.addEventListener('click', hideToast);
    }
    
    console.log('App initialized successfully');
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
    updateCounter('liveVoters', 2847, 3000, 1000);
    updateCounter('totalVotes', 12458, 13000, 1000);
    updateCounter('verifiedToday', 847, 900, 1000);
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
    const voters = document.getElementById('liveVoters');
    const votes = document.getElementById('totalVotes');
    const verified = document.getElementById('verifiedToday');
    const hours = document.getElementById('hoursRemaining');
    
    if (voters) {
        const current = parseInt(voters.textContent.replace(/,/g, '')) || 2847;
        const change = Math.floor(Math.random() * 20) - 5;
        const newValue = Math.max(2800, current + change);
        voters.textContent = newValue.toLocaleString();
    }
    
    if (votes) {
        const current = parseInt(votes.textContent.replace(/,/g, '')) || 12458;
        const change = Math.floor(Math.random() * 100);
        votes.textContent = (current + change).toLocaleString();
    }
    
    if (verified) {
        const current = parseInt(verified.textContent.replace(/,/g, '')) || 847;
        const change = Math.floor(Math.random() * 10);
        verified.textContent = (current + change).toLocaleString();
    }
    
    if (hours) {
        const current = parseInt(hours.textContent) || 48;
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
    if (otpComplete) otpComplete.value = otp;
}

// Initialize camera
async function initCamera() {
    try {
        const video = document.getElementById('video');
        if (!video) return;
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user'
            } 
        });
        video.srcObject = stream;
    } catch (error) {
        console.log('Camera not available');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Registration form
    const regForm = document.getElementById('registration-form');
    if (regForm) {
        regForm.addEventListener('submit', handleRegistration);
    }
    
    // OTP form
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        otpForm.addEventListener('submit', handleOTPVerification);
    }
    
    const resendBtn = document.getElementById('resend-otp');
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendOTP);
    }
    
    // Face verification
    const captureBtn = document.getElementById('capture-btn');
    if (captureBtn) {
        captureBtn.addEventListener('click', captureFace);
    }
    
    const retakeBtn = document.getElementById('retake-btn');
    if (retakeBtn) {
        retakeBtn.addEventListener('click', retakePhoto);
    }
    
    const skipFaceBtn = document.getElementById('skip-face');
    if (skipFaceBtn) {
        skipFaceBtn.addEventListener('click', skipFaceVerification);
    }
    
    // Voting
    const viewStatusBtn = document.getElementById('view-status');
    if (viewStatusBtn) {
        viewStatusBtn.addEventListener('click', viewVotingStatus);
    }
    
    // Modal
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    const confirmVoteBtn = document.getElementById('confirm-vote');
    if (confirmVoteBtn) {
        confirmVoteBtn.addEventListener('click', confirmVote);
    }
    
    const cancelVoteBtn = document.getElementById('cancel-vote');
    if (cancelVoteBtn) {
        cancelVoteBtn.addEventListener('click', cancelVote);
    }
    
    // Navigation
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    console.log('Event listeners set up');
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.style.display === 'flex') {
        navMenu.style.display = 'none';
    } else {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '100%';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.background = 'rgba(255, 255, 255, 0.98)';
        navMenu.style.padding = '1rem';
        navMenu.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
    }
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show modal - FIXED VERSION
function openRegistration() {
    console.log('openRegistration function called');
    if (!modal) {
        console.error('Modal element not found!');
        return;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showStep(1);
    console.log('Modal should be open now');
}

// Close modal
function closeModal() {
    if (!modal) return;
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
    document.getElementById('registration-form')?.reset();
    otpDigits.forEach(digit => digit.value = '');
    updateCompleteOTP();
    
    const capturedPhoto = document.getElementById('captured-photo');
    if (capturedPhoto) {
        capturedPhoto.src = '';
    }
    
    const photoContainer = document.getElementById('captured-photo-container');
    if (photoContainer) {
        photoContainer.style.display = 'none';
    }
    
    // Reset verification
    const verificationLoader = document.getElementById('verification-loader');
    if (verificationLoader) {
        verificationLoader.classList.remove('active');
    }
    
    const verificationSuccess = document.getElementById('verification-success');
    if (verificationSuccess) {
        verificationSuccess.classList.remove('active');
    }
    
    // Hide vote success
    const voteSuccess = document.getElementById('vote-success');
    if (voteSuccess) {
        voteSuccess.classList.remove('active');
    }
    
    const voteConfirmation = document.getElementById('vote-confirmation');
    if (voteConfirmation) {
        voteConfirmation.classList.remove('active');
    }
    
    // Stop camera stream
    const video = document.getElementById('video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    // Clear OTP timer
    if (AppState.otpTimer) {
        clearInterval(AppState.otpTimer);
        AppState.otpTimer = null;
    }
    
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
        currentSection.classList.add('active');
    }
    
    // Update progress steps
    progressSteps.forEach((step, index) => {
        const stepNum = parseInt(step.getAttribute('data-step'));
        if (stepNum < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Update progress bar
    const progressPercentage = ((stepNumber - 1) / (progressSteps.length - 1)) * 100;
    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }
    
    // Handle step-specific initializations
    switch(stepNumber) {
        case 2:
            startOTPTimer();
            break;
        case 3:
            if (AppState.userId) {
                loadUserData();
            }
            initCamera();
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        AppState.phoneNumber = phone;
        showStep(2);
        const phoneDisplay = document.getElementById('phone-display');
        if (phoneDisplay) {
            phoneDisplay.textContent = `OTP sent to +91 ${phone}`;
        }
        showToast('OTP sent to your mobile number', 'success');
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
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        AppState.userId = 'user_' + Date.now();
        if (AppState.otpTimer) {
            clearInterval(AppState.otpTimer);
        }
        showStep(3);
        showToast('Mobile verification successful', 'success');
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
    
    if (!video || !video.srcObject) {
        skipFaceVerification();
        return;
    }
    
    if (canvas && capturedPhoto) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const photoData = canvas.toDataURL('image/jpeg');
        capturedPhoto.src = photoData;
    }
    
    const photoContainer = document.getElementById('captured-photo-container');
    if (photoContainer) {
        photoContainer.style.display = 'block';
    }
    
    const verificationLoader = document.getElementById('verification-loader');
    if (verificationLoader) {
        verificationLoader.classList.add('active');
    }
    
    // Simulate face verification
    setTimeout(() => {
        if (verificationLoader) {
            verificationLoader.classList.remove('active');
        }
        
        const verificationSuccess = document.getElementById('verification-success');
        if (verificationSuccess) {
            verificationSuccess.classList.add('active');
        }
        
        // Stop camera stream
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        // Auto-proceed to voting after 2 seconds
        setTimeout(() => {
            showStep(4);
        }, 2000);
        
        showToast('Face verification successful', 'success');
    }, 2000);
}

// Retake photo
function retakePhoto() {
    const photoContainer = document.getElementById('captured-photo-container');
    if (photoContainer) {
        photoContainer.style.display = 'none';
    }
    
    const verificationSuccess = document.getElementById('verification-success');
    if (verificationSuccess) {
        verificationSuccess.classList.remove('active');
    }
    
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
        // Mock data
        const mockUserData = {
            user: {
                name: 'John Doe',
                location: 'Delhi Central',
                hasVoted: false
            }
        };
        
        AppState.userData = mockUserData.user;
        const voterName = document.getElementById('voter-name');
        const voterLocation = document.getElementById('voter-location');
        
        if (voterName) voterName.textContent = mockUserData.user.name;
        if (voterLocation) voterLocation.textContent = mockUserData.user.location;
    } catch (error) {
        console.error('Error loading user data:', error);
        const voterName = document.getElementById('voter-name');
        const voterLocation = document.getElementById('voter-location');
        
        if (voterName) voterName.textContent = 'John Doe';
        if (voterLocation) voterLocation.textContent = 'Delhi Central';
    }
}

// Load candidates
async function loadCandidates() {
    try {
        // Mock data
        const mockCandidates = [
            { id: 1, name: 'Rahul Sharma', party: 'National Progressive Party', symbol: 'Lotus' },
            { id: 2, name: 'Priya Patel', party: 'Democratic Alliance', symbol: 'Hand' },
            { id: 3, name: 'Amit Kumar', party: 'People\'s Welfare Party', symbol: 'Clock' },
            { id: 4, name: 'Sunita Reddy', party: 'Unity Front', symbol: 'Elephant' }
        ];
        
        displayCandidates(mockCandidates);
    } catch (error) {
        console.error('Error loading candidates:', error);
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
    if (!container) return;
    
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
                <button class="vote-button" data-id="${candidate.id}" data-name="${candidate.name}">
                    <i class="fas fa-vote-yea"></i> Vote for ${candidate.name.split(' ')[0]}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Add event listeners to vote buttons
    container.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const candidateId = e.target.closest('.vote-button').getAttribute('data-id');
            const candidateName = e.target.closest('.vote-button').getAttribute('data-name');
            selectCandidate(candidateId, candidateName);
        });
    });
}

// Select candidate
function selectCandidate(candidateId, candidateName) {
    AppState.selectedCandidate = { id: candidateId, name: candidateName };
    
    // Highlight selected candidate
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Highlight the clicked card
    const selectedCard = document.querySelector(`.vote-button[data-id="${candidateId}"]`)?.closest('.candidate-card');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Show confirmation
    document.getElementById('selected-candidate-name').textContent = candidateName;
    document.getElementById('vote-confirmation').classList.add('active');
}

// Confirm vote
async function confirmVote() {
    if (!AppState.userId || !AppState.selectedCandidate) return;
    
    showLoading(true);
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        document.getElementById('vote-confirmation').classList.remove('active');
        document.getElementById('vote-success').classList.add('active');
        
        // Update vote ID and time
        document.getElementById('vote-id').textContent = `VS-${Date.now().toString().slice(-6)}`;
        document.getElementById('vote-time').textContent = new Date().toLocaleTimeString();
        
        showToast('Your vote has been recorded successfully!', 'success');
        
        // Update live stats
        updateLiveStats();
        
        // Mark user as voted
        AppState.userData = AppState.userData || {};
        AppState.userData.hasVoted = true;
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
    
    // Remove selection from candidates
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// View voting status
function viewVotingStatus() {
    if (AppState.userData) {
        const status = AppState.userData.hasVoted ? 'You have already voted.' : 'You have not voted yet.';
        alert(`Voting Status:\n\nName: ${AppState.userData.name}\nLocation: ${AppState.userData.location}\nStatus: ${status}`);
    } else {
        alert('Please complete the voting process to view your status.');
    }
}

// Show loading overlay
function showLoading(show) {
    if (!loadingOverlay) return;
    
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    if (!toast) {
        console.log('Toast:', message);
        return;
    }
    
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    if (!toastIcon || !toastMessage) return;
    
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
    if (toast) {
        toast.style.display = 'none';
    }
}