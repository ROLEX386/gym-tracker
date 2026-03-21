const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Generate or retrieve Device ID
    let deviceId = localStorage.getItem('gym_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('gym_device_id', deviceId);
    }
    document.getElementById('deviceId').value = deviceId;

    // 2. Check if there's an existing request
    const existingRequestId = localStorage.getItem('gym_request_id');
    if (existingRequestId) {
        // If we have an existing request, jump to pending to check it
        showStep('step-pending');
        startPolling(existingRequestId);
    }

    // 3. Handle Form Submission
    const form = document.getElementById('request-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const errorMsg = document.getElementById('form-error');
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const businessName = document.getElementById('businessName').value.trim();
        
        if (!name || !email || !businessName) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        errorMsg.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/request-license`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, businessName, deviceId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit request');
            }

            // Save request details
            localStorage.setItem('gym_request_id', data.requestId);
            
            // Populate pending screen details
            document.getElementById('pending-name').textContent = name;
            document.getElementById('pending-business').textContent = businessName;
            document.getElementById('pending-deviceId').textContent = deviceId;

            showStep('step-pending');
            startPolling(data.requestId);

        } catch (error) {
            errorMsg.textContent = error.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        }
    });

    // 4. Contact support button
    document.getElementById('contact-support-btn').addEventListener('click', () => {
        // Find admin email from config via API, or just use mailto generic
        window.location.href = "mailto:admin@example.com?subject=License%20Authorization%20Issue";
    });
});

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

let pollIntervalId;

async function startPolling(requestId) {
    // Update basic UI if data available in local storage
    if(document.getElementById('pending-deviceId').textContent === "") {
        document.getElementById('pending-deviceId').textContent = localStorage.getItem('gym_device_id');
    }

    // Wait a brief moment before polling begins
    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-status/${requestId}`);
            if (response.status === 404) {
               clearInterval(pollIntervalId);
               localStorage.removeItem('gym_request_id');
               showStep('step-request');
               return;
            }

            const data = await response.json();

            if (data.status === 'approved') {
                clearInterval(pollIntervalId);
                showStep('step-approved');
                
                // Clear request state
                localStorage.removeItem('gym_request_id');
                
                if (data.downloadUrl) {
                    const dlUrl = data.downloadUrl + `?deviceId=${localStorage.getItem('gym_device_id')}`;
                    document.getElementById('manual-download-link').href = dlUrl;
                    
                    // Auto trigger download
                    setTimeout(() => {
                        window.location.href = dlUrl;
                        document.querySelector('.progress-bar').style.animation = 'none';
                        document.querySelector('.progress-bar').style.width = '100%';
                    }, 1500);
                }
            } else if (data.status === 'denied') {
                clearInterval(pollIntervalId);
                localStorage.removeItem('gym_request_id');
                
                document.getElementById('denial-reason').textContent = data.reason || 'No reason provided';
                showStep('step-denied');
            }
        } catch (error) {
            console.error('Error polling status:', error);
        }
    };

    // Poll immediately, then every 5 seconds
    await checkStatus();
    pollIntervalId = setInterval(checkStatus, 5000);
}
