const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const port = 5000;
const corsOptions = {
    origin: 'http://127.0.0.1:5501',
};

app.use(cors(corsOptions));
app.use(express.json());

const url = 'mongodb+srv://profi-print-user:PallMall1984@cluster0.j1om0bd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'profi-print';
const client = new MongoClient(url);
let db;

// --- Главная функция запуска сервера ---
async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log('✅ Successfully connected to MongoDB!');

        app.listen(port, () => {
            console.log(`✅ Server is listening at http://localhost:${port}`);
        });

    } catch (err) {
        console.error('❌ Failed to start server or connect to MongoDB', err);
        process.exit(1);
    }
}
// --- Маршруты API ---

app.get('/', (req, res) => {
    res.send('Profi-Print Backend is running!');
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        const usersCollection = db.collection('users');
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            username,
            email,
            password: hashedPassword,
            registrationDate: new Date()
        };

        await usersCollection.insertOne(newUser);
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        res.status(200).json({
            message: 'Login successful!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                registrationDate: user.registrationDate
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// ПОЛУЧЕНИЕ ВСЕХ КОММЕНТАРИЕВ
app.get('/comments', async (req, res) => {
    try {
        const commentsCollection = db.collection('comments');
        const comments = await commentsCollection.find().sort({ date: -1 }).toArray();
        res.status(200).json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ message: 'Server error while fetching comments.' });
    }
});

// ДОБАВЛЕНИЕ НОВОГО КОММЕНТАРИЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
app.post('/comments', async (req, res) => {
    try {
        const { author, text } = req.body;
        if (!author || !text) {
            return res.status(400).json({ message: 'Author and text are required.' });
        }

        const commentsCollection = db.collection('comments');
        const newComment = {
            author,
            text,
            date: new Date()
        };

        // Сохраняем комментарий в базу
        await commentsCollection.insertOne(newComment);

        // ИСПРАВЛЕНИЕ: Отправляем в ответе сам объект newComment, а не result.ops
        res.status(201).json({ message: 'Comment added successfully!', comment: newComment });

    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ message: 'Server error while adding comment.' });
    }
});


startServer();