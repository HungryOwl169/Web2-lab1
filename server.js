const db = require("./db");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { auth } = require("express-openid-connect");
require("dotenv").config();

const app = express();

app.use(express.json());
app.set("view engine", "pug");
app.set("views", "./views");

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SESSION_SECRET,
  baseURL: "https://web2-lab1-hedm.onrender.com/",
  clientID: "J01h0lLj24NW8JF5eP6YSwzx8pswgPK4",
  clientSecret:
    "YCB0Epi1M5tBljz_lg0jLhF0WjvZK5RfEaTNTqOa6onqAgELYnVUjL-xpjTDqPQw",
  issuerBaseURL: "https://dev-54gsrlpiqvjmewbp.eu.auth0.com",
};

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://dev-54gsrlpiqvjmewbp.eu.auth0.com/.well-known/jwks.json",
  }),
  audience: "example.com",
  issuer: "https://dev-54gsrlpiqvjmewbp.eu.auth0.com/",
  algorithms: ["RS256"],
});

const requireAuth = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect("/login");
  }
  next();
};

app.use(auth(config));

app.get("/", async (req, res) => {
  try {
    const result = await db.query("select count(*) from QRCodes");
    const QRcnt = result.rows[0].count;
    //console.log(req.oidc.user);
    res.render("index", {
      QRcnt: QRcnt,
      isAuthenticated: req.oidc.isAuthenticated(),
      user: req.oidc.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

app.get("/tickets/:uuid", requireAuth, async (req, res) => {
  const uuid = req.params.uuid;
  try {
    const result = await db.query(`select * from QRCodes where uuid = $1`, [
      uuid,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).send("Ticket not found");
    }
    const userData = result.rows[0];
    res.render("ticket", {
      userData: userData,
      user: req.oidc.user["nickname"],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

app.post("/get-tickets", checkJwt, async (req, res) => {
  const { vatin, firstName, lastName } = req.body;

  if (!vatin || !firstName || !lastName) {
    return res.status(400).json({ error: "Invalid JSON!" });
  }

  try {
    const result = await db.query("select * from QRCodes where vatin = $1", [
      vatin,
    ]);

    if (result.rows.length >= 3) {
      return res.status(400).json({
        error: "Maximum number of tickets generated for the given vatin!",
      });
    }

    const newUuid = uuidv4();
    const date = new Date();
    await db.query(
      "insert into QRCodes (uuid, vatin, firstName, lastName, date) values ($1, $2, $3, $4, $5)",
      [newUuid, vatin, firstName, lastName, date]
    );

    const ticketURL = `https://web2-lab1-hedm.onrender.com/tickets/${newUuid}`;

    QRCode.toDataURL(
      ticketURL,
      { errorCorrectionLevel: "H" },
      (err, qrCodeImage) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error generating QR code");
        }
        res.json({ qrCode: qrCodeImage });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port {port}`);
});
