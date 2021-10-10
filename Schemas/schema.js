
const mongoose = require("mongoose");





const authorSchema = new mongoose.Schema({
    name: String,
    Email: String,
    role: String,
    active: Boolean,
    password: String,
    image:String
  });

const commentSchema = new mongoose.Schema({
    name: String,
    Email: String,
    message: String,
    Approved: Boolean,
  });

const Posts = new mongoose.Schema({
    Title: String,
    Date:String,
    Author: { type: mongoose.Schema.Types.ObjectId, ref: "Author" },
    Article: String,
    category: String,
    visitors: Number,
    image:String,
    SpecialSpec: Object,
    reviews: { type: mongoose.Schema.Types.ObjectId, ref: "Comments" },
  });
  module.exports={Posts,commentSchema,authorSchema}