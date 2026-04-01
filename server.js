const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/jowogamestore')
  .then(() => console.log('Connected to MongoDB!! 💾'))
  .catch(err => console.log('Connection error:', err));

const orderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  game: String,
  price: { type: Number, default: 500 },
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JOWO GAMESTORE API!! 🎮', status: 'Server is running!!' });
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

app.post('/order', async (req, res) => {
  const { name, phone, game } = req.body;
  if (!name || !phone || !game) {
    return res.json({ success: false, message: 'Please fill in all fields!!' });
  }
  try {
    const order = new Order({ name, phone, game, price: 500 });
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

app.listen(PORT, () => {
  console.log('JOWO GAMESTORE Server running on port ' + PORT);
  console.log('Visit: http://localhost:' + PORT);
});