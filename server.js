const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'jowogamestore2026secret';

const MPESA_CONSUMER_KEY = 'Pk7Q33vBhAPQ0YhCpuVSU8G1Clcx29f2dclF8rjZ9QejMJLh';
const MPESA_CONSUMER_SECRET = 'F4uMEjDXaUZjXc7OAKD7SMB4uHohjA2YSk13wOWP2GhX9zGxnGNmFv4F3plH0b3X';
const MPESA_SHORTCODE = '174379';
const MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jowogamestore')
  .then(() => console.log('Connected to MongoDB!!'))
  .catch(err => console.log('Connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  date: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  game: String,
  price: { type: Number, default: 500 },
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JOWO GAMESTORE API!!', status: 'Server is running!!' });
});

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

app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json({ success: true, orders: orders });
  } catch (err) {
    res.json({ success: false, message: 'Error getting orders!!' });
  }
});

app.delete('/order/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted!!' });
  } catch (err) {
    res.json({ success: false, message: 'Error deleting order!!' });
  }
});

async function getMpesaToken() {
  const auth = Buffer.from(MPESA_CONSUMER_KEY + ':' + MPESA_CONSUMER_SECRET).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: 'Basic ' + auth }
  });
  return res.data.access_token;
}

app.post('/mpesa/stkpush', async (req, res) => {
  const { phone, amount, game } = req.body;
  if (!phone || !amount) {
    return res.json({ success: false, message: 'Phone and amount required!!' });
  }
  try {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString('base64');
    const formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: 'https://jowo-gamestore-backend.onrender.com/mpesa/callback',
        AccountReference: 'JOWO GAMESTORE',
        TransactionDesc: 'Payment for ' + game
      },
      { headers: { Authorization: 'Bearer ' + token } }
    );
    res.json({ success: true, message: 'STK Push sent!! Check your phone!!', data: response.data });
  } catch (err) {
    res.json({ success: false, message: 'Mpesa error!!', error: err.message });
  }
});

app.post('/mpesa/callback', (req, res) => {
  console.log('Mpesa Callback:', JSON.stringify(req.body));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('JOWO GAMESTORE Server running on port ' + PORT);
  console.log('Visit: http://localhost:' + PORT);
});
