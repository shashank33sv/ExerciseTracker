const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new Schema({
  username: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// ✅ FIXED: Correct POST /api/users route
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = new User({ username });
    const savedUser = await user.save();

    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ FIXED: Correct GET /api/users route
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/:id/exercises', async (req, res) => {
  const id = req.params.id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const exercise = new Exercise({
      user_id: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('There was an error saving the exercise');
  }
});

app.get('/api/users/:id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params.id;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).send('User not found');

    let dateFilter = {};
    if (from) dateFilter['$gte'] = new Date(from);
    if (to) dateFilter['$lte'] = new Date(to);

    let filter = { user_id: id };
    if (from || to) filter.date = dateFilter;

    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to fetch logs');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
