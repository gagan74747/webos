import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8080;

const ACCESS_SECRET = "access-secret";
const REFRESH_SECRET = "refresh-secret";

// Hardcoded users
const USERS = {
  alice: { password: "pass123", id: "u1", name: "Alice" },
  bob:   { password: "pass456", id: "u2", name: "Bob"   },
};

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    "https://webos-test-main.onrender.com",
    "https://webos-f8dj.onrender.com"
  ],
  credentials: true, // Required for cookies to flow cross-origin
}));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "frontend")));

// Just to make the domain reachable in browser so you can inspect cookies
app.get("/oauth2", (req, res) => {
    console.log("Cookies received at /oauth2:", req.cookies);
  res.send("<h1>Auth Server</h1>");
});

// --- POST /oauth2/login ---
// Validates user, sets refresh_token cookie, returns access token
app.post("/oauth2/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = jwt.sign(
    { sub: user.id, name: user.name },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { sub: user.id },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  // Set refresh token as HttpOnly cookie
  res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  domain: "webos-test-main.onrender.com",
  path: "/oauth2",
  secure: true,        // ← enable this now
  sameSite: "lax",
});

res.cookie("test_cookie", `Avinash Arora ${new Date().toISOString()}`, {
  httpOnly: true,
  domain: "webos-test-main.onrender.com",
  path: "/oauth2",
  secure: true,        // ← enable this now
  sameSite: "lax",
});

  res.json({ accessToken });
});

// --- POST /oauth2/token ---
// Reads refresh_token cookie, returns new access token
app.post("/oauth2/token", (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  const testCookie = req.cookies?.test_cookie;
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const accessToken = jwt.sign(
      { sub: payload.sub },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    console.log(accessToken, testCookie);
    res.json({ accessToken, testCookie });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// --- POST /oauth2/logout ---
app.post("/oauth2/logout", (req, res) => {
  res.clearCookie("refresh_token", {
    domain: "webos-test-main.onrender.com",
    path: "/oauth2",
  });
  res.json({ message: "Logged out" });
});

// https.createServer({
//   key:  fs.readFileSync("./certs/abc-abc.test.my-key.pem"),
//   cert: fs.readFileSync("./certs/abc-abc.test.my.pem"),
// }, app).listen(9443, () => console.log("Auth server on https://abc-abc.test.my:9443"));

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
