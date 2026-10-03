const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'new',
  'under_review',
  'sold',
  'rejected',
  'out_for_delivery',
  'out_of_stock',
];

const orderSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    coffeeType: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'new' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'orders', versionKey: false }
);

module.exports = {
  Order: mongoose.models.Order || mongoose.model('Order', orderSchema),
  ORDER_STATUSES,
};