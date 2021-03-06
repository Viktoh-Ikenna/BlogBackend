const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
var cors = require("cors");
const jwt = require("jsonwebtoken");
const multer  = require('multer')
// var cookieParser = require("cookie-parser");
const path = require('path')
const {promisify} = require('util');
const session = require('express-session');
const mongoDbSeesion = require('connect-mongodb-session')(session)
const { truncate } = require("fs");

const app = express();

app.set('trust proxy',true)

// app.use(cookieParser());

const allowedOrigins=[
  'http://localhost:3000',
  'https://blogfrontend-6366e.web.app',
  "https://protected-reef-93525.herokuapp.com",
  'http://localhost:3500'
]

app.use(cors({ origin: allowedOrigins, credentials: true }));

dotenv.config({ path: "./.env" });
const dbUrl = process.env.DATABASE_CON.replace(
  "<password>",
  process.env.DATABASE_PASS
);


///session settings...
const store = new mongoDbSeesion({
  uri:dbUrl,
  collection:'mysessions'
})



//applying middlewares

app.use(express.json());

//connecting to the db
mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("successfully connected to the database"));

// const store =new mongoDbSeesion({
//   mongooseConnection: mongoose.connection,
// })

app.use(session({
  secret:"any key saved",
  resave:false,
  saveUninitialized:false,
  cookie: { httpOnly: true, secure:false , maxAge: 1000 * 60 * 60 * 48, sameSite: true },
  store:store,

}))



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
  Date:String,
  posts: { type: mongoose.Schema.Types.ObjectId, ref: "Posts" },

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
});
Posts.virtual('reviews',{
  ref:'Comment',
  foreignField:'posts',
  localField:'_id'
})

Posts.set('toObject', { virtuals: true });
Posts.set('toJSON', { virtuals: true });


const BlogPosts = mongoose.model("Posts", Posts);
const Author = mongoose.model("Author", authorSchema);
const Comments = mongoose.model("Comment", commentSchema);




//configuring images with multer..
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Images')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '.' + file.originalname.split('.')[1])
  }
})
const proileStore = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'blogImages')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage })
const uploadProfile = multer({ storage: proileStore })



const router = express.Router();


//check logged in ..
const checklogged =async(req,res,next)=>{
console.log(req.headers.token)
  try{
    // console.log(req.session)
    const decode = await promisify(jwt.verify)(req.headers.token, process.env.TOKEN_KEY);
    const user = await Author.findById(decode.id);
    req.user=user
  }catch(err){

  }
      
next()
}


router
  .post("/BlogPosts",upload.single('Featured'),checklogged,(req, res) => {
    const {Title,Article,category,SpecialSpec,Date}=JSON.parse(req.body.posts)
    let image = req.file?`${req.protocol}://${req.get(
      "host"
    )}/${req.file.path}`:"";
    BlogPosts.create({Title,Author:req.user._id,Article,category,image,SpecialSpec,Date})
      .then((data) => {
        res.json({ state: "success", data });
      })                                                                                           
      .catch((e) => {
        res.send({ e });
      });
  })
  .post("/comments", (req, res) => {
    console.log(req.body)
    if(req.body.email!==""){
      Comments.create(req.body).then((data) => {
      res.json({ state: "success", data });
    });
    }
    
  })
  .post("/createUser", (req, res) => {
    Author.create(req.body).then((data) => {
      res.json({ state: "success", data });
    });
  })
  .post("/updatePosts/:id",upload.single('Featured'),checklogged,(req, res) => {
    const {Title,Article,category,SpecialSpec,Date}=JSON.parse(req.body.posts);
    let image = req.file?`${req.file.path}`:"";
  // console.log(image)
  BlogPosts.findByIdAndUpdate(req.params.id,{Title,Author:req.user._id,Article,category,image,SpecialSpec,Date},{new:true})
      .then((data) => {
        // console.log(data)
        res.json({ state: "success", data });
      })                                                                                           
      .catch((e) => {
        res.send({ e });
      });
  })
  .get('/Blogposts',checklogged,async(req,res)=>{
    try{
      if(req.user){
        const posts = await BlogPosts.find();
        res.json({ state: true,data:posts});
      }else{
        res.json({ state: true,data:'Access Denied'});
      }
    }catch(err){
      console.log(err)
    }

  })
  .get('/posts/:id',checklogged,async(req,res)=>{
    try{
      if(req.user){
        const posts = await BlogPosts.findById(req.params.id);
        res.json({ state: true,data:posts});
      }else{
        res.json({ state: true,data:'Access Denied'});
      }
    }catch(err){
      console.log(err)
    }
  })
  .get('/Blogposts-page',async(req,res)=>{
    // req.session.isAuth=true
    try{
     
        const posts = await BlogPosts.find();
        res.json({ state: true,data:posts});
    }catch(err){
      console.log(err)
    }

  })
  .get('/posts-page/:id',async(req,res)=>{
  
        const posts = await BlogPosts.findById(req.params.id)
        const d= await posts.populate('reviews').execPopulate()
        
        res.json({ state: true,data:d});
     
  })






app.post(
  "/admin-login",
  async (req, res) => {
    
    try {
      const user = await Author.findOne({ password: req.body.password,name:req.body.name});
      // console.log(user)
      if (!user) throw "user doesnt exist";
      const token = await jwt.sign({ id: user._id }, process.env.TOKEN_KEY, {
        expiresIn: "90d",
      });

      // try for the token cookie 
      try {
        // res.cookie("token", token, {
        //   // domain: '.blogfrontend-6366e.web.app',
        //   // domain:".localhost:3000",
        //   // path:"/admin-login",
        //   httpOnly: true,
        //   secure: false,
        //   expires: new Date(Date.now() + 600000 * 50),
        // });     
        // req.session.token=token
      } catch (err) {
        console.log(err);
      }

      //end of token tring.......

      res.json({ state: "success", data: user, token });
    } catch (err) {
      res.json({ state: "success", data: err });
    }
  }
)
app.post('/admin-profile',uploadProfile.single('profile'),checklogged,async(req,res)=>{
  const User = await Author.findOne(req.user);
  User.image=req.file.path;
  await User.save()

  // Author.create({image:req.file.path}).then((data)=>{
  //   console.log(data)

  // })
  res.json(User)
})
app.get("/admin",checklogged, (req, res) => {
  // console.log(req.user)
  try{
    if(!req.user) throw 'no user'
    res.json({ state: true,data:req.user});
  }catch(err){
    res.send({ state: false ,err});
  }

});
app.use('/',express.static(path.join(__dirname,'/')))
app.use("/api/save", router);
app.listen(process.env.PORT||3500, () => console.log("app is listenig to port 3500"));
