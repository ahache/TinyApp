const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const methodOverride = require('method-override');

function generateRandomString() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomString;
}

const urlDatabase = {};
const users = {};
const analytics = {};

// Helper function to populate analytics
//
// analytics = {
//   url: {
//     visits: [ { visitor_id, timeStamp } ],
//     uniqueVisits: #
//   }
// }
//
function addVisit(shortURL, visitor_id) {
  // Full date and time
  const date = new Date();
  const dateString = date.toDateString();
  const time = date.toLocaleTimeString("en-US", {timeZone: "America/Los_Angeles"});
  // Check if url exists in analytics
  if (analytics[shortURL]) {
    let firstVisit = true;
    const visits = analytics[shortURL].visits;
    // Loop through all visits to check if current visitor has used short link
    for (const visit of visits) {
      if (visit.visitor_id === visitor_id) {
        firstVisit = false;
        break;
      }
    }
    visits.push({ visitor_id: visitor_id, timeStamp: `${dateString} ${time}` });
    if (firstVisit) {
      analytics[shortURL].uniqueVisits += 1;
    }
  } else {
    analytics[shortURL] = {
      visits: [{ visitor_id: visitor_id, timeStamp: `${dateString} ${time}` }],
      uniqueVisits: 1
    };
  }
}

// Return object of urls created by logged in user
function getUsersUrls(user) {
  let urlsByUser = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === user.id) {
      urlsByUser[url] = urlDatabase[url];
    }
  }
  return urlsByUser;
}

const app = express();

const port = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  secret: 'cookiemonster',
  maxAge: 24 * 60 * 60 * 1000
}));

// visitor cookie
app.use(function (req, res, next) {
  if (!req.session.visitor_id) {
    req.session.visitor_id = generateRandomString();
  }
  next();
});

app.get("/", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    res.redirect("/urls");
  } else {
    res.render("prompt");
  }
});

app.get("/urls/new", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    const user = users[userCookie];
    const templateVars = {
      user: user
    };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    const user = users[userCookie];
    // Call to helper function
    const usersUrls = getUsersUrls(user);
    const templateVars = {
      urls: usersUrls,
      user: user
    };
    res.render("urls_index", templateVars);
  } else {
    res.render("prompt");
  }
});

// Any logged in user can view a url stats page. Only the owner can update.
app.get("/urls/:id", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    const user = users[userCookie];
    const id = req.params.id;
    if (!urlDatabase[id]) {
      res.status(400).send("Short Url does not exist");
      return;
    }
    const templateVars = {
      analytics: analytics,
      urls: urlDatabase,
      user: user,
      shortURL: id
    };
    res.render("urls_show", templateVars);
  } else {
    res.render("prompt");
  }
});

app.get("/u/:shortURL", (req, res) => {
  const visitor_id = req.session.visitor_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) {
    res.status(400).send("Short Url does not exist");
    return;
  }
  // Update analytics
  addVisit(shortURL, visitor_id);
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

app.get("/register", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    res.redirect("/urls");
  } else {
    res.render("register");
  }
});

app.get("/login", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie) {
    res.redirect("/urls");
  } else {
    res.render("login");
  }
});

// Update urlDatabase
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const userCookie = req.session.user_id;
  const longURL = req.body.longURL;
  urlDatabase[shortURL] = { "userID": userCookie, "longURL": longURL };
  res.redirect(`/urls/${shortURL}`);
});

app.delete("/urls/:id", (req, res) => {
  const userCookie = req.session.user_id;
  const shortURL = req.params.id;
  const owner = urlDatabase[shortURL].userID;
  if (userCookie !== owner) {
    res.status(400).send("You can only delete your own urls");
  } else {
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  }
});

// Only a logged in owner will have form entry access to this route
app.put("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const userCookie = req.session.user_id;
  const owner = urlDatabase[shortURL].userID;
  if (userCookie !== owner) {
    res.status(400).send("You can only update your own urls");
  } else {
    // Owner has changed link, analytics are reset
    delete analytics[shortURL];
    urlDatabase[shortURL].longURL = req.body.longURL;
    res.redirect("/urls");
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Must Enter Email and Password");
    return;
  }
  for (const user in users) {
    if (users[user].email === email) {
      if (bcrypt.compareSync(password, users[user].hashed_password)) {
        // Successful login, set user cookie
        req.session.user_id = users[user].id;
        res.redirect('/urls');
        return;
      } else {
        res.status(403).send("Wrong Password");
        return;
      }
    }
  }
  res.status(403).send("Email is not registered");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  for (const user in users) {
    if (users[user].email === email) {
      res.status(400).send("Email is already registered");
      return;
    }
  }
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Must Enter Email and Password");
  }
  const hashed_password = bcrypt.hashSync(password, 10);
  users[id] = { id, email, hashed_password };
  req.session.user_id = id;
  res.redirect('/urls');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
