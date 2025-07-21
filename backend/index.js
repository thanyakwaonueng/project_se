// Required External Modules
const express = require('express');

// App Variables
const app = express();
const port = process.env.PORT || 4000; // Use environment variable PORT or default to 4000

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
