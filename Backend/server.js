const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');

const port = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize socket and get io instance
const io = initializeSocket(server);

// Make io accessible in the app for controllers
app.set('io', io);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Socket.IO server initialized`);
});
