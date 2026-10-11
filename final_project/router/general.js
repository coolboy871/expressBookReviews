const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

/* ------------------------------------------------------------------
   Promise helpers: each lookup is wrapped in a Promise so the routes
   below can retrieve book data asynchronously.
------------------------------------------------------------------ */

// Resolve with the full book list
const getBooksPromise = () => {
  return new Promise((resolve) => {
    resolve(books);
  });
};

// Resolve with one book by ISBN, or reject if it does not exist
const getBookByISBNPromise = (isbn) => {
  return new Promise((resolve, reject) => {
    if (books[isbn]) {
      resolve(books[isbn]);
    } else {
      reject(`Book with ISBN ${isbn} not found`);
    }
  });
};

// Resolve with all books by an author, or reject if none match
const getBooksByAuthorPromise = (author) => {
  return new Promise((resolve, reject) => {
    const booksbyauthor = Object.keys(books)
      .filter((isbn) => books[isbn].author.toLowerCase() === author.toLowerCase())
      .map((isbn) => ({ isbn: isbn, title: books[isbn].title, reviews: books[isbn].reviews }));
    if (booksbyauthor.length > 0) {
      resolve(booksbyauthor);
    } else {
      reject(`No books found by author ${author}`);
    }
  });
};

// Resolve with all books with a title, or reject if none match
const getBooksByTitlePromise = (title) => {
  return new Promise((resolve, reject) => {
    const booksbytitle = Object.keys(books)
      .filter((isbn) => books[isbn].title.toLowerCase() === title.toLowerCase())
      .map((isbn) => ({ isbn: isbn, author: books[isbn].author, reviews: books[isbn].reviews }));
    if (booksbytitle.length > 0) {
      resolve(booksbytitle);
    } else {
      reject(`No books found with title ${title}`);
    }
  });
};

/* ------------------------------------------------------------------
   Task 6: Register a new user
------------------------------------------------------------------ */
public_users.post("/register", (req,res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    return res.status(404).json({ message: "Unable to register user. Username and password are required." });
  }
  if (!isValid(username)) {
    return res.status(404).json({ message: "User already exists!" });
  }

  users.push({ username: username, password: password });
  return res.status(200).json({ message: "Customer successfully registered. Now you can login" });
});

/* ------------------------------------------------------------------
   Tasks 1-5: Public routes, implemented with async/await and Promises
------------------------------------------------------------------ */

// Task 1: Get the book list available in the shop (async/await)
public_users.get('/', async function (req, res) {
  try {
    const allBooks = await getBooksPromise();
    return res.status(200).send(JSON.stringify(allBooks, null, 4));
  } catch (error) {
    return res.status(500).json({ message: "Error retrieving books" });
  }
});

// Task 2: Get book details based on ISBN (Promise callbacks)
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  getBookByISBNPromise(isbn)
    .then((book) => res.status(200).send(JSON.stringify(book, null, 4)))
    .catch((error) => res.status(404).json({ message: error }));
});

// Task 3: Get book details based on author (async/await)
public_users.get('/author/:author', async function (req, res) {
  try {
    const booksbyauthor = await getBooksByAuthorPromise(req.params.author);
    return res.status(200).send(JSON.stringify({ booksbyauthor }, null, 4));
  } catch (error) {
    return res.status(404).json({ message: error });
  }
});

// Task 4: Get all books based on title (async/await)
public_users.get('/title/:title', async function (req, res) {
  try {
    const booksbytitle = await getBooksByTitlePromise(req.params.title);
    return res.status(200).send(JSON.stringify({ booksbytitle }, null, 4));
  } catch (error) {
    return res.status(404).json({ message: error });
  }
});

// Task 5: Get book review
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  getBookByISBNPromise(isbn)
    .then((book) => res.status(200).send(JSON.stringify(book.reviews, null, 4)))
    .catch((error) => res.status(404).json({ message: error }));
});

/* ------------------------------------------------------------------
   Tasks 10-13: Retrieve books with Axios, using async/await and
   Promise callbacks. Each function calls the routes above over HTTP.
------------------------------------------------------------------ */

// Task 10: Get all books using an async callback function with Axios
const getAllBooks = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/`);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching book list: ${error.message}`);
  }
};

// Task 11: Search by ISBN using Promises with Axios
const getBookByISBN = (isbn) => {
  return axios.get(`${BASE_URL}/isbn/${isbn}`)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(`Error fetching book with ISBN ${isbn}: ${error.message}`);
    });
};

// Task 12: Search by author using async/await with Axios
const getBooksByAuthor = async (author) => {
  try {
    const response = await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching books by author ${author}: ${error.message}`);
  }
};

// Task 13: Search by title using async/await with Axios
const getBooksByTitle = async (title) => {
  try {
    const response = await axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching books with title ${title}: ${error.message}`);
  }
};

// Routes that return the Axios-based results
public_users.get('/async/books', async (req, res) => {
  try {
    const data = await getAllBooks();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

public_users.get('/async/isbn/:isbn', (req, res) => {
  getBookByISBN(req.params.isbn)
    .then((data) => res.status(200).json(data))
    .catch((error) => res.status(404).json({ message: error.message }));
});

public_users.get('/async/author/:author', async (req, res) => {
  try {
    const data = await getBooksByAuthor(req.params.author);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
});

public_users.get('/async/title/:title', async (req, res) => {
  try {
    const data = await getBooksByTitle(req.params.title);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(404).json({ message: error.message });
  }
});

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;
