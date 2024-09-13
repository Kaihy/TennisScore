
// Function to load the configuration (IP address)
async function loadConfig() {
    try {
        const response = await fetch('/config');  // Fetch the IP address from the server
        const ipAddress = await response.json();  // Parse the JSON response
        return ipAddress;
    } catch (error) {
        console.error('Failed to load IP address:', error);  // Handle fetch errors
        return null;  // Return null if there's an error
    }
}

// Initialize the configuration dynamically
(async function initializeConfig() {
    const ipAddress = await loadConfig();  // Await the loaded IP address
    if (ipAddress) {
        // Update the config object with the fetched IP address
        config.baseUrl = `http://${ipAddress}:5500`;
        config.apiBaseUrl = `http://${ipAddress}:3000`;
        console.log('Config initialized with IP:', ipAddress);
    } else {
        console.error('Could not load config, IP address is null');
    }
})();


    // Function to redirect to the registration page
    function UserRegistrationHtmlUrl() {
        window.location.href = `${config.baseUrl}/registration.html`;
    }

    // Function to redirect to the password renewal page
    function RenewPasswordHtmlUrl() {
        window.location.href = `${config.baseUrl}/renewPassword.html`;
    }

    // Function to redirect to the index page after login
    function IndexHtmlUrl() {
        window.location.href = `${config.baseUrl}/index.html`;
    }

    // Handle the login form submission
    document.getElementById('loginForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value; 
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${config.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                // Parse the JSON response to get the data
                const data = await response.json();
                alert('Login successful');

                // Store the User ID in local storage
                localStorage.setItem('userId', data.user_id);
                console.log('Logged in user ID:', data.user_id);

                // Redirect to the index page or another page
                IndexHtmlUrl();
            } else {
                alert('Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
