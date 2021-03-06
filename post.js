const express = require('express');
const mongo = require('mongodb').MongoClient;
const router = express.Router()
const dotenv = require('dotenv');
const auth = require('./auth');
dotenv.config();

const dburl = process.env.DB_URL;

const con = (dburl, callback) => {
  mongo.connect(dburl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }, (err, client) => {
    if (err) {
      console.error(err)
      return
    }
    const db = client.db('likileaks')
    callback(db)
  })
}

const updateCred = (author, increase) => {
  con(dburl, (db) => {
    const userCol = db.collection('user') 
    userCol.update({username: author}, {$inc: {"credibility": increase ? 1 : -1}})
  })
}


router.get('/posts', (req, res) => {
  const username = req.query.username
  const p = req.query.page
  // const page = p ? p : 0
  const option = username ? {author: username} : {}
  con(dburl, (db) => {
    const postCol = db.collection('post')
    postCol.find(option, {projection: {_id: 0}}).toArray((err, result) => {
      if (err) {
        console.log(err)
        res.send(404)
        return
      }
      res.json(result)
    })
  })
})

router.get('/downVote', auth, (req, res) => {
  // update table
  const id = req.query.id;
  con(dburl, (db) => {
    const postCol = db.collection('post')
    postCol.findOneAndUpdate({id : id}, {$inc : {downVote : 1}}, (err, result) => {
      if (err) {
        console.log(err);
        res.send(404);
      } else {
        if (result) {
          updateCred(result.value.author, false)
          res.json({message : "success"})
          return
        }
        res.send(200)
      }
    })
  })
})

router.get('/upVote', auth, (req, res) => {
  const id = req.query.id;
  con(dburl, (db) => {
    const postCol = db.collection('post')
    postCol.findOneAndUpdate({id : id}, {$inc : {upVote : 1}}, (err, result) => {
      if (err) {
        console.log(err);
        res.send(404);
      } else {
        if (result) {
          updateCred(result.value.author, true)
          res.json({message : "success"})
          return
        }
        res.send(200)
      }
    })
  })
})

router.post('/newPost', auth, (req, res) => {
  const obj = req.body
  obj.upVote = 0.0;
  obj.downVote = 0.0;
  obj.tags = obj.description.split(/([.,!?:;'\"-]|\s)+/)
                              .filter(str => str.startsWith("#"))
                              .map(str => str.substring(1))
  con(dburl, (db) => {
    const userCol = db.collection('post')
    userCol.insertOne(obj, (err, result) => {
      if (err) {
        console.log(err)
        res.send(404)
        return
      }
      if (result) {
        res.send(200)
        return
      }
      res.send(404)
    })
  })
  // res.send(200)
});

module.exports = router
