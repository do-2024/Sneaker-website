import express from 'express';
import bodyParser from 'body-parser';
import expressSession from 'express-session';
import axios from 'axios'; // For making HTTP requests


import dotenv from 'dotenv';
dotenv.config();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const app = express();

app.use(bodyParser.json());

app.use(
    expressSession({
        secret: 'cst2120 secret',
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: true
    })
);

// import classes from mongodb module
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';


//Create connection URI fo root and no password
const connectionURI = "mongodb://127.0.0.1:27017?retryWrites=true&w=majority";

//Set up client
const client = new MongoClient(connectionURI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,//Setting this to true breaks text index queries.
        deprecationErrors: true,
    }
});

const database = client.db('social_media');
const usersCollection = database.collection('Users');
const contentsCollection = database.collection('Contents');
console.log("Connected to MongoDB");

app.use(express.static('public'));

// Route to fetch weather data
app.get('/:studentId/weather', async (req, res) => {
    const { city } = req.query; // Extract city name from query parameters

    if (!city) {
        return res.status(400).send({ error: true, message: "City name is required." });
    }

    try {
        // Fetch weather data from OpenWeatherMap API
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                q: city,
                appid: WEATHER_API_KEY,
                units: 'metric', // Use metric units (Celsius)
            },
        });

        const weatherData = response.data;

        // Respond with relevant weather information
        res.send({
            error: false,
            city: weatherData.name,
            temperature: weatherData.main.temp,
            description: weatherData.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`,
        });
    } catch (err) {
        console.error("Error fetching weather data:", err.message);

        // Handle errors (e.g., city not found)
        res.status(500).send({
            error: true,
            message: err.response?.data?.message || "An error occurred while fetching weather data.",
        });
    }
});

app.get('/M00865553/login', (req, res) => {
    console.log(req.session);
    if (req.session.username === undefined) {
        res.send({ login: false });
    }
    else {
        res.send({ login: true, username: req.session.username });
    }
})


// post route for contents
app.post('/M00865553/contents', async (req, res) => {
    const { username, title, text } = req.body; // Extract username, title, and text from the request body

    // Validate request body
    if (!username || !title || !text) {
        return res.status(400).json({ error: true, message: "Missing username, title, or text in request body." });
    }

    try {
        // Check if the username exists in the Users collection
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: true, message: "Username not found. Only registered users can post content." });
        }

        // Store the content in the Contents collection
        const result = await contentsCollection.insertOne({ username, title, text, timestamp: new Date() });
        res.status(201).json({
            error: false,
            message: "Content stored successfully.",
            contentId: result.insertedId,
        });
    } catch (err) {
        console.error("Error storing content:", err);
        res.status(500).json({
            error: true,
            message: "Failed to store content. Please try again later.",
        });
    }
});


app.delete('/M00865553/login', (req, res) => {
    req.session.destroy();
    res.send({ login: false });
})


app.post('/M00865553/login', async (req, res) => {
    const loginUser = req.body;

    const query = { $and: [{ username: loginUser.username }, { password: loginUser.password }] };
    const users = await usersCollection.find(query).toArray();
    if (users.length === 1) {
        // login successful -session message
        req.session.username = loginUser.username;
        console.log(req.session);
        res.send({ login: true, username: loginUser.username });
    }
    else if (users.length > 1) {
        // weird error - two users with same suername - fix this at registration
        res.send({ error: true, message: "Data error" });
    }
    else {
        res.send({ login: false, message: "username and/or password incorrect" });
    }
    return;
});


async function getUsers(resquest, response) {
    const users = await usersCollection.find({}).toArray();
    response.send(users);
}

app.get('/M00865553/users', getUsers);

app.post('/M00865553/users', async (req, res) => {
    const { username, name, password } = req.body;

    try {
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.json({ message: 'Username already registered.' });
        } else {
            await usersCollection.insertOne({ username, password, name });
            res.json({ message: 'Registration successful!' });
        }
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ message: 'Error registering user.' });
    }
});


app.post('/M00865553/follow/:username', async (req, res) => {
    if (!req.session.username) {
        return res.send({ error: true, message: "You need to be logged in to follow someone" });
    }
    if (!req.params.username) {
        return res.send({ error: true, message: "you need to specify a user to follow" });
    }

    //Find peson who we are following  - check they exist
    const userToFollow = await usersCollection.findOne({ username: req.params.username });
    if (!userToFollow) {
        return res.send({ error: true, message: "you are tyring to folow someone who does not exist!" });
    }

    //Find user
    const user = await usersCollection.findOne({ username: req.session.username });
    if (!user) {
        return res.send({ error: true, message: "username not found" });
    }

    if (!user.following) {
        user.following = [];
    }
    user.following.push(req.params.username);

    const result = await usersCollection.updateOne({ username: req.session.username }, { $set: { following: user.following } })
    console.log(result);

    res.send({ error: false, following: req.params.username });
});

app.get('/M00865553/contents', async (req, res) => {
    if (!req.session.username) {
        return res.send({ error: true, message: "You must be logged in to view contents." });
    }

    try {
        // Retrieve the logged-in user's data
        const user = await usersCollection.findOne({ username: req.session.username });

        if (!user || !user.following || user.following.length === 0) {
            return res.send({ error: false, contents: [], message: "You are not following anyone." });
        }

        // Retrieve contents from users the logged-in user is following
        const followingUsers = user.following;
        const contents = await contentsCollection.find({ username: { $in: followingUsers } }).toArray();

        res.send({ error: false, contents });
    } catch (err) {
        console.error("Error retrieving contents:", err);
        res.status(500).send({ error: true, message: "Error retrieving contents." });
    }
});


app.delete('/M00865553/follow/:username', async (req, res) => {
    if (!req.session.username) {
        return res.send({ error: true, message: "You must be logged in to unfollow someone." });
    }

    const unfollowUsername = req.params.username; // Extract the username from the path
    if (!unfollowUsername) {
        return res.send({ error: true, message: "You must specify a username to unfollow." });
    }

    try {
        // Retrieve the logged-in user's data
        const user = await usersCollection.findOne({ username: req.session.username });

        if (!user || !user.following || !user.following.includes(unfollowUsername)) {
            return res.send({ error: true, message: "You are not following this user." });
        }

        // Remove the unfollowed user from the `following` list
        const updatedFollowing = user.following.filter(user => user !== unfollowUsername);
        const result = await usersCollection.updateOne(
            { username: req.session.username },
            { $set: { following: updatedFollowing } }
        );

        if (result.modifiedCount === 1) {
            res.send({ error: false, message: `You have successfully unfollowed ${unfollowUsername}.` });
        } else {
            res.send({ error: true, message: "Failed to update your following list." });
        }
    } catch (err) {
        console.error("Error during unfollow operation:", err);
        res.status(500).send({ error: true, message: "An error occurred while trying to unfollow the user." });
    }
});


app.get('/M00865553/users/search', async (req, res) => {
    const query = req.query.q; // Extract query parameter
    if (!query) {
        return res.send({ error: true, message: "No search query provided." });
    }

    try {
        // Search the Users collection using the text index
        const users = await usersCollection.find({ $text: { $search: query } }).toArray();

        if (users.length === 0) {
            return res.send({ error: false, message: "No users match the search query.", users: [] });
        }

        res.send({ error: false, users });
    } catch (err) {
        console.error("Error during user search:", err);
        res.status(500).send({ error: true, message: "An error occurred while searching for users." });
    }
});


app.get('/M00865553/contents/search', async (req, res) => {
    const query = req.query.q; // Extract the search query from query parameters

    if (!query) {
        return res.status(400).json({ error: true, message: "No search query provided." });
    }

    try {
        // Perform a text-based search on the Contents collection
        const contents = await contentsCollection
            .find({ $text: { $search: query } }, { score: { $meta: "textScore" } }) // Include relevance score
            .sort({ score: { $meta: "textScore" } }) // Sort by relevance
            .toArray();

        if (contents.length === 0) {
            return res.json({ error: false, message: "No contents match the search query.", contents: [] });
        }

        res.json({ error: false, contents });
    } catch (err) {
        console.error("Error during content search:", err);
        res.status(500).json({ error: true, message: "An error occurred while searching for contents." });
    }
});

app.listen(8080);
console.log("Express listening on port 8080");


