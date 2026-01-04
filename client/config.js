// config.js
const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://your-backend-domain.com/api'  // Change this to your backend URL
};

window.CONFIG = CONFIG;