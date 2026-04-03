const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;
const JWT_SECRET = 'jowogamestore2026secret';

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jowogamestore')
  .then(() => console.log('Connected to MongoDB!!'))
  .catch(err => console.log('Connection error:', err));

// USER MODEL
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ORDER MODEL
const orderSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  game: String,
  price: { type: Number, default: 500 },
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// HOME ROUTE
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JOWO GAMESTORE API!!', status: 'Server is running!!' });
});

// GET ALL GAMES
app.get('/games', (req, res) => {
  const games = [
    { id: 1, name: 'FIFA 19', price: 500, category: 'FIFA' },
    { id: 2, name: 'FIFA 20', price: 500, category: 'FIFA' },
    { id: 3, name: 'FIFA 21', price: 500, category: 'FIFA' },
    { id: 4, name: 'FIFA 22', price: 500, category: 'FIFA' },
    { id: 5, name: 'FIFA 23', price: 500, category: 'FIFA' },
    { id: 6, name: 'GTA 5', price: 500, category: 'PC' },
    { id: 7, name: 'GTA Vice City', price: 500, category: 'PC' },
    { id: 8, name: 'Call of Duty', price: 500, category: 'PC' },
    { id: 9, name: 'Mortal Kombat', price: 500, category: 'Fighting' },
    { id: 10, name: 'Need for Speed', price: 500, category: 'Racing' }
  ];
  res.json({ success: true, games: games });
});

// REGISTER
app.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'Please fill in all fields!!' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: 'Email already registered!!' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, phone, password: hashed });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Account created!!', token, user: { name, email, phone } });
  } catch (err) {
    res.json({ success: false, message: 'Error creating account!!' });
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: 'Please fill in all fields!!' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'Email not found!!' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ success: false, message: 'Wrong password!!' });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Logged in!!', token, user: { name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.json({ success: false, message: 'Error logging in!!' });
  }
});

// GET USER PROFILE
app.get('/profile', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.json({ success: false, message: 'Not logged in!!' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    const orders = await Order.find({ userId: decoded.id }).sort({ date: -1 });
    res.json({ success: true, user, orders });
  } catch (err) {
    res.json({ success: false, message: 'Invalid token!!' });
  }
});

// POST AN ORDER
app.post('/order', async (req, res) => {
  const { name, phone, game, userId } = req.body;
  if (!name || !phone || !game) {
    return res.json({ success: false, message: 'Please fill in all fields!!' });
  }
  try {
    const order = new Order({ name, phone, game, price: 500, userId: userId || 'guest' });
    await order.save();
    res.json({ success: true, message: 'Order saved!!', order: order });
  } catch (err) {
    res.json({ success: false, message: 'Error saving order!!' });
  }
});

// GET ALL ORDERS
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json({ success: true, orders: orders });
  } catch (err) {
    res.json({ success: false, message: 'Error getting orders!!' });
  }
});

// DELETE AN ORDER
app.delete('/order/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted!!' });
  } catch (err) {
    res.json({ success: false, message: 'Error deleting order!!' });
  }
});

app.listen(PORT, () => {
  console.log('JOWO GAMESTORE Server running on port ' + PORT);
  console.log('Visit: http://localhost:' + PORT);
});