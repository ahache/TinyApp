const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");

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

function getUsersUrls(user) {
  let urlsByOwner = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID == user.id) {
      urlsByOwner[url] = urlDatabase[url];
    }
  }
  return urlsByOwner;
}

const app = express();

const port = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  secret: 'cookiemonster',
  maxAge: 24 * 60 * 60 * 1000
}));

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie === undefined) {
    res.redirect("/login");
  } else {
    const user = users[userCookie];
    const templateVars = {
      user: user
    }
    res.render("urls_new", templateVars);
  }
});

app.get("/urls", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie === undefined) {
    res.render("prompt");
  } else {
    const user = users[userCookie];
    const usersUrls = getUsersUrls(user);
    const templateVars = {
      urls: usersUrls,
      user: user
    };
    res.render("urls_index", templateVars);
  }
});

app.get("/urls/:id", (req, res) => {
  const userCookie = req.session.user_id;
  if (userCookie === undefined) {
    res.render("prompt");
  } else {
    const user = users[userCookie];
    const id = req.params.id;
    const templateVars = {
      urls: urlDatabase,
      user: user,
      shortURL: id
    }
    res.render("urls_show", templateVars);
  }
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/urls", (req, res) => {
  const id = generateRandomString();
  const userID = req.session.user_id;
  const url = req.body.longURL;
  urlDatabase[id] = { "userID": userID, "longURL": url };
  res.redirect(`/urls/${id}`);
});

app.post("/urls/:id/delete", (req, res) => {
  const currentUser = req.session.user_id;
  const owner = urlDatabase[req.params.id].userID;
  if (currentUser !== owner) {
    res.status(400).send("You can only delete your own urls")
  } else {
    delete urlDatabase[req.params.id];
    res.redirect("/urls");
  }
});

app.post("/urls/:id", (req, res) => {
  const currentUser = req.session.user_id;
  const owner = urlDatabase[req.params.id].userID;
  if (currentUser !== owner) {
    res.status(400).send("You can only update your own urls")
  } else {
    urlDatabase[req.params.id].longURL = req.body.longURL;
    res.redirect("/urls");
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Must Enter Email and Password");
  }
  for (const user in users) {
    if (users[user].email === email) {
      if (bcrypt.compareSync(password, users[user].hashed_password)) {
        req.session.user_id = users[user].id;
        res.redirect('/urls');
      } else {
        res.status(403).send("Wrong Password");
      }
    }
  }
  res.status(403).send("Cannot find user");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
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
