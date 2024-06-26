const express = require('express');
const mysql = require('mysql');
const app = express();
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');


const db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'logindata'
});


app.set('view engine', 'hbs');
app.use('/', require('./routes/pages'));
app.use(express.urlencoded({ extended: true }));

const port = 81;
// Server running on port 80
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

db.connect((error)=>{
  if(error){
    console.log("db connect error");
  }else{
    console.log("db connected");
  }
})

// Handle form submission to main.html
app.post('/main', async (req, res) => {
    try {
        // Get the selected value from the form
        let dt = req.body.searchdata;
        console.log("Selected value:", dt);

        // Construct URL based on selected value
        const url = `https://www.auto-data.net/en/results?brand=${dt}`;
        const className = 'title';
        const infolink = 'a';
        const contentSelector = 'span.content';
        const imgSelector = 'img';

        // Call function to fetch data from the URL
        const json = await fetchClassDetails(url, className, contentSelector, imgSelector, infolink);

        // Send the HTML response back to the client
        res.send(generateHTML(json));
    } catch (error) {
        console.error('Error processing data in post request:', error);
        res.redirect('404.html');
    }
});

app.post('/login', (req, res) => {
  console.log('login request');
  const user = req.body.username;
  const pass = req.body.password;

  if (!user || !pass) {
    return res.render('login', { message: 'Username and Password are required' });
  }

  const query = 'SELECT * FROM users WHERE name = ? AND password = ?';
  db.query(query, [user, pass], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
    }

    // Add debug log for results
    console.log('Query results:', results);

    if (results && results.length > 0) {
      res.render('main', { message: 'Logout' });
    } else {
      res.render('login', { message: 'Incorrect Username or Password' });
    }
  });
});

app.post('/register', (req, res) => {
  const { name, password, email, mobile } = req.body;

  if (!name || !password || !email || !mobile) {
    return res.status(400).send('All fields are required');
  }

  const query = 'INSERT INTO users (name, password, email, mobile) VALUES (?, ?, ?, ?)';
  const values = [name, password, email, mobile];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('signup',{message:'User registered successfully'});
  });
});

app.get('/getinfo',async (req,res)=>{
  const a_car = req.query.c_l;
  const url = `https://www.auto-data.net${a_car}`;
  console.log(url);
  const data = await fetchTableBody(url);
  //console.log(data);
  const html = Car_info_generator(data);
  res.send(html);
})

// Function to fetch and extract class name details
async function fetchClassDetails(url, className, contentSelector, imgSelector, aselector) {
    try {
        let jsonData = [];
        // Fetch the HTML content of the URL
        const { data } = await axios.get(url);

        // Load the HTML into cheerio
        const $ = cheerio.load(data);

        // Extract the elements with the specified class name
        const elements = $(`.${className}`);
        const carinfos = $(aselector);
        const contentElements = $(contentSelector);
        const imageElements = $(imgSelector);

        // Prepare an array to hold extracted data
        let uniqueItems = new Set();

        // Iterate over the elements found, starting from index 15
        elements.each((index, element) => {
            if (index >= 15) {
                let title = $(element).text().trim();
                let carinfolink = $(carinfos[index + 7]).attr('href'); 
                let content = $(contentElements[index]).text().trim();
                let img = $(imageElements[index]).attr('src');

                if (title && img && content) {
                    let item = JSON.stringify({ title, content, img, carinfolink});
                    if (!uniqueItems.has(item)) {
                        uniqueItems.add(item);
                        jsonData.push({ title, content, img, carinfolink});
                    }
                }
            }
        });

        // Return the JSON data array
        return jsonData;
    } catch (error) {
        // Properly handle and log errors
        console.error(`Error fetching or parsing HTML: ${error.message}`);
        throw error; // Propagate the error back
    }
}

// Function to generate HTML content
function generateHTML(data) {
    let html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Car2Go</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
      </head>
      <style>
      .button {
              padding: 5px;
              border-radius: 10px;
              margin: 5px;
              background-color: #000;
              color: #fff;
              text-decoration: none;
              transition: 0.3s ease-in-out;
          }
          .button a {
              text-decoration: none;
              color: #fff;
          }
          .button:hover {
              background-color: #fff;
              color: #000;
          }
      .container-fluid ul{
            border-radius: 10px;
            transition: 0.3s ease-in-out;
        }

        .container-fluid ul li a{
            color: #fff;
            border-radius: 10px;
        }
        .container-fluid ul li a:hover{
            color: #000;
            border-radius: 10px;
            background-color: #fff;

        }
      </style>
      <body>
      <nav class="navbar bg-dark border-bottom border-body" data-bs-theme="dark">
        <div class="container-fluid justify-content-center">
            <ul class="nav justify-content-center">
                <li class="nav-item">
                    <a class="nav-link active"href="home">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">Buy/Rent</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="main">Car Specifications</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="login">
                            Logout
                    </a>
                </li>
            </ul>
        </div>
    </nav>
      <form action="/getinfo" method="get">
        <div class="container">
          <a href="main"><button type="button" class="button btn-dark w-25">Back</button></a>
          <div class="row">`;

    // Iterate over the data array and create cards for each item
    data.forEach(item => {
        html += `
        <div class="col-md-4">
          <div class="card mb-4">
            <img src="https://www.auto-data.net${item.img}" class="card-img-top" alt="${item.title}">
            <div class="card-body">
              <h5 class="card-title">${item.title}</h5>
              <p class="card-text">${item.content}</p>
              <a href="/getinfo?c_l=${item.carinfolink}" class="btn btn-primary">Fetch Data</a>
            </div>
          </div>
        </div>`;
    });

    html += `
          </div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
        </form>
        </body>
    </html>`;
    return html;
}


async function fetchTableBody(url) {
  try {
      // Fetch the HTML content of the URL
      const { data } = await axios.get(url);

      // Load the HTML into cheerio
      const $ = cheerio.load(data);

      // Extract the tbody element
      $('.adin').remove();
      $('.datalock').remove();
      $('tbody a').each((index, element) => {
        // Get the text content of the <a> element
        const text = $(element).text();
        
        // Replace the <a> element with a <p> element containing the same text
        $(element).replaceWith(`<p>${text}</p>`);
    });
    $('p').each((index, element) => {
      const text = $(element).text().trim();
  
      // Replace specific content condition
      if (text === 'Log in to see.') {
          $(element).text('-');
      }
  });
      const tableBody = $('.cardetailsout tbody');
      
      // Return the tbody HTML
      return tableBody.html(); // Return inner HTML of the tbody
  } catch (error) {
      // Properly handle and log errors
      console.error(`Error fetching or parsing HTML: ${error.message}`);
      throw error; // Propagate the error back
  }
}


// Function to generate HTML content
function Car_info_generator(tabledata) {
  let html = `<!doctype html>
  <html lang="en">
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Car2Go</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
      </head>
      <style>
          .btn {
              padding: 5px;
              margin: 5px;
              background-color: #000;
              color: #fff;
              text-decoration: none;
              transition: 0.3s ease-in-out;
          }
          .btn a {
              text-decoration: none;
              color: #fff;
          }
          .btn:hover {
              background-color: #fff;
              color: #000;
          }
          .container-fluid ul{
            border-radius: 10px;
            transition: 0.3s ease-in-out;
        }

        .container-fluid ul li a{
            color: #fff;
            border-radius: 10px;
        }
        .container-fluid ul li a:hover{
            color: #000;
            border-radius: 10px;
            background-color: #fff;

        }
      </style>
      <body>
      <nav class="navbar bg-dark border-bottom border-body" data-bs-theme="dark">
        <div class="container-fluid justify-content-center">
            <ul class="nav justify-content-center">
                <li class="nav-item">
                    <a class="nav-link active"href="home">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">Buy/Rent</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="main">Car Specifications</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="login">
                            Logout
                    </a>
                </li>
            </ul>
        </div>
    </nav>
          <div class="container">
              <a href="main"><button type="button" class="btn btn-dark w-25">Back</button></a>
              <div class="row">
                  <table class="table table-dark table-striped">
                      <tbody>
                          ${tabledata} <!-- Insert tbody content here -->
                      </tbody>
                  </table>
              </div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
      </body>
  </html>`;

  return html;
}

