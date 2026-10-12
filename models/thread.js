'use strict';
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false }
});

const threadSchema = new mongoose.Schema({
  board: { type: String, required: true, index: true },
  text: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: { type: String, required: true },
  replies: { type: [replySchema], default: [] }
});

module.exports = mongoose.model('Thread', threadSchema);
