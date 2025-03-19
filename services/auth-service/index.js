const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Shared secret must match Kong's configuration (see kong.yml)
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_ISSUER = process.env.JWT_ISSUER || "default-key";

// Database connection setup
const dbConfig = {
  host: process.env.DB_HOST || "mysql",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "admin",
  database: process.env.DB_NAME || "sustainable_consumption",
  waitForConnections: true,
  connectionLimit: 10,
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection on startup
async function testDbConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("Database connection established successfully");
    conn.release();
  } catch (err) {
    console.error("Error connecting to database:", err);
    process.exit(1);
  }
}

testDbConnection();

// Open endpoint: Register a new user
app.post("/register", async (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res
      .status(400)
      .json({ message: "Name, username and password are required" });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store the user
    await pool.query(
      "INSERT INTO users (name, username, password) VALUES (?, ?, ?)",
      [name, username, hashedPassword]
    );

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Open endpoint: Login and receive a JWT token
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get the user
    const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);

    // Sign a JWT token with enhanced security
    const token = jwt.sign(
      {
        sub: user.id,
        iss: JWT_ISSUER,
        aud: "sustainable-consumption-app",
        iat: now,
        exp: now + 3600, // 1 hour
        jti: require("crypto").randomBytes(16).toString("hex"), // Unique token ID
        username: user.username,
        name: user.name,
      },
      JWT_SECRET,
      { algorithm: "HS256" }
    );

    // Generate refresh token (longer lived)
    const refreshJti = require("crypto").randomBytes(16).toString("hex");
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        iss: JWT_ISSUER,
        aud: "sustainable-consumption-app-refresh",
        jti: refreshJti,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, jti, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [user.id, refreshToken, refreshJti]
    );

    res.json({
      token,
      refreshToken,
      expiresIn: 3600,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Open endpoint: Refresh access token using refresh token
app.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Check if refresh token exists in database
    const [tokens] = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()",
      [refreshToken]
    );

    if (tokens.length === 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Get user information
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [
      decoded.sub,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = users[0];

    // Current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);

    // Generate new access token
    const newToken = jwt.sign(
      {
        sub: user.id,
        iss: JWT_ISSUER,
        aud: "sustainable-consumption-app",
        iat: now,
        exp: now + 3600, // 1 hour
        jti: require("crypto").randomBytes(16).toString("hex"),
        username: user.username,
        name: user.name,
      },
      JWT_SECRET,
      { algorithm: "HS256" }
    );

    res.json({
      token: newToken,
      expiresIn: 3600,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

// Secure endpoint: Logout and blacklist the token
app.post("/logout", async (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const refreshToken = req.body.refreshToken;

  if (!authHeader) {
    return res.status(400).json({ message: "No access token provided" });
  }

  const token = authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  try {
    // Verify the token is valid before blacklisting
    const decoded = jwt.verify(token, JWT_SECRET);

    // Calculate token expiry time
    const expiryDate = new Date(decoded.exp * 1000); // Convert UNIX timestamp to Date

    // Start a transaction for data consistency
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Add token to blacklist in database with JWT ID
      await connection.query(
        "INSERT INTO token_blacklist (jti, token, user_id, expiry) VALUES (?, ?, ?, ?)",
        [decoded.jti, token, decoded.sub, expiryDate]
      );

      // Revoke refresh token if provided
      if (refreshToken) {
        await connection.query(
          "DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?",
          [refreshToken, decoded.sub]
        );
      }

      await connection.commit();
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Logout error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
});

// Middleware to check if token is blacklisted
const checkBlacklist = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(); // No token, let the route handler decide what to do
  }

  const token = authHeader.split(" ")[1];

  try {
    // Decode without verification to get the JTI
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.jti) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Check if token JTI is blacklisted (more efficient than checking the whole token)
    const [results] = await pool.query(
      "SELECT * FROM token_blacklist WHERE jti = ?",
      [decoded.jti]
    );

    if (results.length > 0) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    next();
  } catch (err) {
    console.error("Token blacklist check error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Task to clean up expired tokens from the blacklist
function setupTokenCleanupTask() {
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    try {
      const [result] = await pool.query(
        "DELETE FROM token_blacklist WHERE expiry < NOW()"
      );
      console.log(
        `Cleaned up ${result.affectedRows} expired tokens from blacklist`
      );

      // Also clean up expired refresh tokens
      const [refreshResult] = await pool.query(
        "DELETE FROM refresh_tokens WHERE expires_at < NOW()"
      );
      console.log(
        `Cleaned up ${refreshResult.affectedRows} expired refresh tokens`
      );
    } catch (err) {
      console.error("Token cleanup error:", err);
    }
  }, CLEANUP_INTERVAL);
}

// Apply middleware to all routes
app.use(checkBlacklist);

// Start the token cleanup task
setupTokenCleanupTask();

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
