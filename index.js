const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI)
const userSchema = new Schema({
  username: String,
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
mongoose.startSession
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async (req, res) => {
  console.log(req.body)
  const userobj = new User({
    username: req.body.username
  })

  try {
    const user = await userobj.save()
    res.json(user);
  } catch (error) {
    console.log(error);
  }
})

app.post("/api/users/:id/exercises", async (req, res) => {
  const id = req.params.id;
  const { description, duration, date } = req.body

  try {
    const user = await User.findById(id)
    if (!user) {
      res.send("User not found")
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      });
    }
  } catch (error) {
    console.log(error);
    res.send("there was an saving in saving exercise");
  }
})


app.get("/api/user", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("no users");
  } else {
    res.json(users);
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    res.send("user not found");
    return;
  }
  let dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to); // fixed to use $lte for "to" date
  }
  let filter = {
    user_id: id
  }
  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500)
  const log = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString() // fixed from e.date to exercise.date
  }))
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
