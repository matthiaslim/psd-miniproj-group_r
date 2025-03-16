const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Shared secret must match Kong's configuration (see kong.yml)
const JWT_SECRET = "supersecret";
const JWT_ISSUER = "default-key"; // This will match the consumer key

// In-memory user store (for demo purposes)
const users = {};

// Token blacklist (in production, use Redis or another persistent store)
const tokenBlacklist = new Set();

// Open endpoint: Register a new user
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.status(400).json({ message: "User already exists" });
  }
  // In production, always hash passwords before storing them.
  users[username] = { password, permissions: ["basic"] };
  res.json({ message: "User registered successfully" });
});

// Open endpoint: Login and receive a JWT token
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  // Sign a JWT token that expires in 1 hour
  const token = jwt.sign(
    { sub: username, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: "1h", issuer: JWT_ISSUER }
  );
  res.json({ token, permissions: user.permissions });
});

app.post("/logout", (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(400).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  try {
    // Verify the token is valid before blacklisting
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add token to blacklist
    tokenBlacklist.add(token);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Middleware to check if token is blacklisted
const checkBlacklist = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(); // No token, let the route handler decide what to do
  }

  const token = authHeader.split(" ")[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: "Token has been revoked" });
  }

  next();
};

// Apply middleware to all routes
app.use(checkBlacklist);

// Protected endpoint: Kong's JWT plugin ensures only valid requests are forwarded here.
app.get("/protected", (req, res) => {
  res.json({ message: "Access granted to protected resource" });
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
