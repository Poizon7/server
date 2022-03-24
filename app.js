// Test
const express = require('express')
const app = express()
let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

//const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const bp = require('body-parser')
const cp = require('cookie-parser')

// const mysql = require('mysql')
const { Client } = require('pg')
const config = require('./config')
const { response } = require('express')

app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))
app.use(cp())

// Generate secret for jwt
const secret = 'hT%adgsd67a&s76d66&gd76ag9kjwdy2'

// MySQL connection
// const connection = mysql.createConnection(config)

const connection = new Client(config);
async () => {await connection.connect()};


// Header setup
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://10.156.10.167:8080') // update to match the domain you will make the request from
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})

// Server active testing
app.get('/', (req, res) => {
  res.send('server active')
})

// User verification with jwt
app.get('/verify', async (req, res) => {
  const token = req.cookies['token'] // Get cookie

  if (typeof(token) === 'string') { // Confirm that cookie exists
    const decode = jwt.verify(token, secret) // Verify token

    // Responde
    res.cookie('token', jwt.sign({ userid: decode.userid, username: decode.username }, secret), {maxAge: 300000})
    res.send(decode)
  } else {
    res.sendStatus(200)
  }
})

app.post('/user', (req, res) => {
  const id = req.body.id

  // Create SQL query
  const sql = `select username from users where id = ${id}`

  // Execute query
  connection.query(sql, (error, results, fields) => {
    if (error) {
      console.error(error.message)
      res.sendStatus(500)
    }
    else {
      res.send(results)
    }
  })
})

// Login user
app.post('/login', async (req, res) => {
  // Get data from POST
  const user = req.body.username
  const pass = req.body.password

  // Create SQL query
  const sql = `select password, id from users where username='${user}'`

  // Execute query
  connection.query(sql, async (error, results) => {
    if (error) {
      console.error(error.message)
      res.sendStatus(500)
    } else {
      const password = results[0].password
      const access = await bcrypt.compare(pass, password) // Compare password

      if (access) {
        res.cookie('token', jwt.sign({userid: results[0].id, username: user}, secret), {maxAge: 300000})
        res.send({})
      } else {
        res.sendStatus(200)
      }
    } 
  })
})

// Sign up
app.post('/signup', async (req, res) => {
  // Get data from POST
  const user = req.body.username
  const pass = await bcrypt.hash(req.body.password, 4)

  // Create SQL query
  const sql = `insert into users (username,password) values ('${user}','${pass}')`

  // Execute query
  connection.query(sql, (error) => {
    if (error) {
      console.error(error.message)
      res.sendStatus(500)
    } else {
      res.sendStatus(200)
    }
  })
})

// Add post
app.post('/addPost', async (req, res) => {
  // Get data from POST
  const id = req.body.id
  const title = req.body.title
  const body = req.body.body
  const date = GetDate() // Get current date
  
  // Create SQL query
  const sql = `insert into posts (userid,title,text,daytime) values ('${id}','${title}','${body}','${date}')`

  // Execute query
  connection.query(sql, (error, results, fields) => {
    if (error) {
      console.error(error.message)
      res.sendStatus(500)
    }
    else {
      res.sendStatus(200)
    }
  })
}) // Skriv om

// Get all posts
app.get('/getPosts', async (req, res) => {
  // Greate respones data
  let data = {
    posts: []
  }

   // Create SQL query
   let sql = `select p.id, p.userid, p.title, p.text, p.daytime, u.username, count(l.postid) likes from posts p inner join users u on u.id = p.userid left join likes l on l.postid = p.id group by p.id order by p.daytime desc`

   // Execute query
   connection.query(sql, (error, results, fields) => {
     if (error) {
       console.error(error.message)
     }
     else {
       data.posts = results
       res.send(data)
     }
   })
})

// Get post published by the loged in user
app.post('/getUserPost', async (req, res) => {
  const id = req.body.id
  let data = { posts: [] }

  // Create SQL query
  let sql = `select p.id, p.userid, p.title, p.text, p.daytime, u.username, count(l.postid) likes from posts p inner join users u on u.id = p.userid left join likes l on l.postid = p.id where p.userid = ${id} group by p.id order by p.daytime desc`

  // Execute query
  connection.query(sql, (error, results, fields) => {
    if (error) {
      return console.error(error.message)
    }
    else {
      data.posts = results
      res.send(data)
    }
  })
})

app.post('/getSpecificPost', async (req, res) => {
  // Create SQL query
  const sql = `select p.id, p.userid, p.title, p.text, p.daytime, u.username, count(l.postid) likes from posts p inner join users u on u.id = p.userid left join likes l on l.postid = p.id where p.id = '${req.body.id}'`

  // Execute query
  connection.query(sql, (error, results, fields) => {
    if (error) {
      return console.error(error.message)
    }
    else {
      res.send(results)
    }
  })
})

// Add like to post
app.post('/like', async (req, res) => {
  // Get data frpm POST
  const id = req.body.id

  // Verify and decode jwt from cookie
  const token = req.cookies['token']
  if (typeof(token) === 'string') {
    const decode = jwt.verify(token, secret)

    // Create SQL query
    let sql = `insert into likes values ('${id}','${decode.userid}')`

    // Execute query
    connection.query(sql, async (error, results, fields) => {
      if (error) {
        return console.error(error.message)
      }
    })
  }
})

// Remove like from post
app.post('/unLike', async (req, res) => {
  // Get data from POST
  const id = req.body.id

  // Verify and decode jwt from cookie
  const token = req.cookies['token']
  if (typeof(token) === 'string') {
    const decode = jwt.verify(token, secret)

    // Create SQL query
    let sql = `delete from likes where postid = '${id}' AND userid = '${decode.userid}'`

    // Execute query
    connection.query(sql, async (error, results, fields) => {
      if (error) {
        return console.error(error.message)
      }
    })
  }
})

// Get which posts the user has liked
app.get('/liked', async (req, res) => {
  const token = req.cookies['token']
  if (typeof(token) === 'string') {
    const decode = jwt.verify(token, secret)

    // Create SQL query
    const sql = `select postid from likes where userid = '${decode.userid}'`

    // Execute query
    connection.query(sql, async (error, results, fields) => {
      if (error) {
        return console.error(error.message)
      }
      else {
        res.send(results)
      }
    })
  }
})

// Comment on post
app.post('/comment', async (req, res) => {
  // Get data from POST
  const postid = req.body.id
  const text = req.body.text

  // Get current date
  var date = GetDate();

  // Verify and decode jwt token
  const token = req.cookies['token']
  if (typeof(token) === 'string') {
    const decode = jwt.verify(token, secret)

    // Create SQL query
    const sql = `insert into comments (postid,userid,text,daytime) values ('${postid}','${decode.userid}','${text}','${date}')`

    // Execute query
    connection.query(sql, async (error, results, fields) => {
      if (error) {
        return console.error(error.message)
      }
    })
  }
})

// Get comments for one post
app.post('/getComments', async (req, res) => {
  // Get data from POST
  const postid = req.body.id

  let data = {
    comments: [],
  }
  // Create SQL query
  let sql = `select c.id, c.postid, c.userid, c.text, c.daytime, u.username from comments c inner join users u on u.id = c.userid where c.postid = ${postid}`

  // Execute query
  connection.query(sql, async (error, results, fields) => {
    if (error) {
      return console.error(error.message)
    }
    else {
      data.comments = results
      res.send(data)
    }
  })
})

// Search from users and post titles
app.post('/search', (req, res) => {
  const search = req.body.search

  let data = {
    users: [],
    posts: []
  }

  let sql = `select * from users where username like '%${search}%'`

  connection.query(sql, async (error, results, fields) => {
    if (error) {
      return console.error(error.message)
    }
    else {
      data.users = results

      sql = `select * from posts where title like '%${search}%'`

      connection.query(sql, async (error, results, fields) => {
        if (error) {
          return console.error(error.message)
        }
        else {
          data.posts = results
          res.send(data)
        }
      })
    }
  })
})

// Start server connection
const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

// Functions
// Get current date
function GetDate () {
  var pad = function(num) { return ('00'+num).slice(-2) } // Padding if singel digit

  var date = new Date()

  // Convert from Date object to string
  date = date.getUTCFullYear()       + '-' +
        pad(date.getUTCMonth() + 1)  + '-' +
        pad(date.getUTCDate())       + ' ' +
        pad(date.getUTCHours() + 1)  + ':' +
        pad(date.getUTCMinutes())    + ':' +
        pad(date.getUTCSeconds());
  return date
}

// Ending program in a proper way
process.on('SIGINT', () => {
  console.log('Exit server')
  connection.end()
  server.close()
  process.exit()
})