
// script for register form. this checks the username and password inputted by the user and ouptuts the message
// regsitration successsful for correct input and registration error for incorrect input
document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent form from reloading the page

    const username = document.getElementById('registerUsername').value; 
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;

    try {
        const response = await fetch('http://localhost:8080/M00865553/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, name }),
        });

        const result = await response.json();
        console.log(result);

        if (response.ok && result.message === 'Registration successful!') {
            document.getElementById('register-success').textContent = result.message;
            document.getElementById('register-success').style.display = 'block';
            document.getElementById('register-error').style.display = 'none';

            // Optionally reset the form
            document.getElementById('register-form').reset();
        } else {
            document.getElementById('register-error').textContent = result.message || 'Registration failed. Please try again.';
            document.getElementById('register-error').style.display = 'block';
            document.getElementById('register-success').style.display = 'none';
        }
    } catch (error) {
        console.error('Registration error:', error);
        document.getElementById('register-error').textContent = 'Error connecting to server. Please try again later.';
        document.getElementById('register-error').style.display = 'block';
        document.getElementById('register-success').style.display = 'none';
    }
});


// Function to search for users
async function searchUsers() {
    const query = document.getElementById('searchInput').value; // Get the search input
    const resultsContainer = document.getElementById('searchResults'); // Get the container for results
    resultsContainer.innerHTML = ""; // Clear previous results

    if (!query) {
        resultsContainer.innerHTML = "<p>Please enter a search term.</p>";
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/M00865553/users/search?q=${query}`);
        const data = await response.json();

        if (data.error) {
            resultsContainer.innerHTML = `<p>${data.message}</p>`;
            return;
        }

        if (data.users.length === 0) {
            resultsContainer.innerHTML = "<p>No users found.</p>";
            return;
        }

        // Display results with Follow buttons
        data.users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <p><strong>${user.name}</strong> (@${user.username})</p>
                <button onclick="followUser('${user.username}')">Follow</button>
            `;
            resultsContainer.appendChild(userCard);
        });
    } catch (err) {
        console.error("Error fetching search results:", err);
        resultsContainer.innerHTML = "<p>Error fetching search results. Please try again later.</p>";
    }
}


// Function to follow a user
async function followUser(username) {
    try {
        const response = await fetch(`http://localhost:8080/M00865553/follow/${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for session authentication
        });

        const result = await response.json();

        if (result.error) {
            alert(`Error: ${result.message}`);
        } else {
            alert(result.message);
        }
    } catch (err) {
        console.error("Error following user:", err);
        alert("An error occurred while trying to follow the user.");
    }
}


    
    document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent form submission from refreshing the page
    
        // Gather form data
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
    
        // Create login data object
        const loginData = { username: username, password: password };
    
        try {
            // Send AJAX request to the backend
            const response = await fetch('http://localhost:8080/M00865553/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData), // Send the data as JSON
            });
    
            const result = await response.json();
    
            if (result.login) {
                // If login is successful
                document.getElementById('login-success').style.display = 'block';
                document.getElementById('login-error').style.display = 'none';
                document.getElementById('login-success').textContent = `Welcome, ${result.username}!`;
    
                // Optionally, redirect to another page
                // window.location.href = '/dashboard.html';
            } else {
                // If login fails
                document.getElementById('login-error').style.display = 'block';
                document.getElementById('login-success').style.display = 'none';
                document.getElementById('login-error').textContent = result.message || 'Invalid username or password.';
            }
        } catch (error) {
            // Handle network or server errors
            console.error('Error during login:', error);
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('login-success').style.display = 'none';
            document.getElementById('login-error').textContent = 'Error connecting to the server. Please try again.';
        }
    });
    

async function fetchFollowedContents() {
    try {
        const response = await fetch('http://localhost:8080/M00865553/contents', {
            method: 'GET',
            credentials: 'include', // Ensures cookies (session data) are sent
        });

        const result = await response.json();

        if (!result.error) {
            const contentsContainer = document.getElementById('contents-container');
            contentsContainer.innerHTML = ''; // Clear existing content

            if (result.contents.length === 0) {
                contentsContainer.textContent = "No posts from followed users.";
                return;
            }

            // Append posts
            result.contents.forEach(content => {
                const postDiv = document.createElement('div');
                postDiv.classList.add('post');
                postDiv.innerHTML = `
                    <h3>${content.title}</h3>
                    <p>${content.text}</p>
                    <p><em>by ${content.username}</em></p>
                `;
                contentsContainer.appendChild(postDiv);
            });
        } else {
            console.error('Error fetching contents:', result.message);
        }
    } catch (error) {
        console.error('Error connecting to server:', error);
    }
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', fetchFollowedContents);


// function for weather display
async function fetchWeather() {
    const city = document.getElementById('city-input').value;

    if (!city) {
        alert("Please enter a city name.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/M00865553/weather?city=${encodeURIComponent(city)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const weather = await response.json();

        const resultsContainer = document.getElementById('weather-results');
        resultsContainer.innerHTML = ''; // Clear previous results

        if (weather.error) {
            resultsContainer.textContent = weather.message;
            return;
        }

        // Display weather information
        resultsContainer.innerHTML = `
            <h3>Weather in ${weather.city}</h3>
            <p>Temperature: ${weather.temperature}°C</p>
            <p>Description: ${weather.description}</p>
            <img src="${weather.icon}" alt="${weather.description}">
        `;
    } catch (err) {
        console.error("Error fetching weather data:", err);
        alert("An error occurred while fetching weather data.");
    }
}

