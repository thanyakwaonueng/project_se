// Required External Modules
const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// App Variables
const app = express();
app.use(express.json());
const port = process.env.PORT || 4000; // Use environment variable PORT or default to 4000

//*****
//THIS IS DUMMY ENDPOINT ADDING FOR TESTING THE DB CONNECTION PURPOSE
// Create user
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get all users
app.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
//*****


// App Configuration (optional, can include middleware, view engine setup, etc.)
// app.set('view engine', 'pug');
// app.set('views', './views');
// app.use(express.static('public')); // Serve static files from 'public' directory

// Routes Definitions
app.get('/', (req, res) => {
  res.send('Hello, Express!'); // Simple response for the root route
});

// Server Activation
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

