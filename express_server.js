const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

function generateRandomString() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return randomString;
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "user1": {
    id: "user1",
    email: "boater@gmail.com",
    password: "Pass7774"
  },
  "user2": {
    id: "user2",
    email: "redcars@gmail.com",
    password: "funkyTown1414"
  }
}

const app = express();

const port = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.get("/", (req, res) => {
  const userCookie = req.cookies['user_id'];
  let user = null;
  if (userCookie) {
    user = users[userCookie];
  }
  const templateVars = {
    urls: urlDatabase,
    user: user
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userCookie = req.cookies['user_id'];
  let user = null;
  if (userCookie) {
    user = users[userCookie];
  }
  const templateVars = {
    user: user
  };
  res.render("urls_new", templateVars);
});

app.get("/urls", (req, res) => {
  const userCookie = req.cookies['user_id'];
  let user = null;
  if (userCookie) {
    user = users[userCookie];
  }
  const templateVars = {
    urls: urlDatabase,
    user: user
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const userCookie = req.cookies['user_id'];
  let user = null;
  if (userCookie) {
    user = users[userCookie];
  }
  const templateVars = {
    urls: urlDatabase,
    user: user,
    shortURL: req.params.id,
    fullURL: urlDatabase[req.params.id]
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
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
  urlDatabase[id] = req.body.longURL;
  res.redirect(`/urls/${id}`);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.longURL;
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Must Enter Email and Password");
  }
  for (const user in users) {
    if (users[user].email === email) {
      if (users[user].password === password) {
        res.cookie('user_id', users[user].id);
        res.redirect('/urls');
      } else {
        res.status(403).send("Wrong Password");
      }
    }
  }
  res.status(403).send("Cannot find user");
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.status(400).send("Must Enter Email and Password");
  }
  users[id] = { id, email, password };
  res.cookie('user_id', id);
  res.redirect('/urls');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
