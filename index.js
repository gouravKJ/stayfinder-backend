const express=require("express");
const app=express();
const path=require("path");
const mongoose=require("mongoose");
const multer=require("multer");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt");
const cors=require("cors");
const { ref } = require("process");
const { isNumberObject } = require("util/types");
require('dotenv').config();


app.use(cors());
app.use(express.json());
app.use("/uploads",express.static(path.join(__dirname,"uploads")));

//mongodb coonection
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("mongodb connected"))
.catch(()=>console.log("not connected"));


//user 
const userschema=new mongoose.Schema({
   name:String,
   email:{type:String,unique:true},
   password:String
   
});

const user=mongoose.model("user",userschema);

//listing
const listingschema=new mongoose.Schema({
    title:String,
    location:String,
    description:String,
    image:String,
    price:Number
  
});

const listing=mongoose.model("listing",listingschema);

//booking
const bookingschema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:"user"},
    listing:{type:mongoose.Schema.Types.ObjectId,ref:"listing"},
    checkin:String,
    checkout:String
});

const booking=mongoose.model("booking",bookingschema);


//host
const hostschema=new mongoose.Schema({
    name:String,
    contact:String,
    property:String,
    message:String
});

const host=mongoose.model("host",hostschema);

//auth
const auth=async(req,res,next)=>{
    const token=req.headers.authorization;
    if(!token) return res.status(404).json({message:"no token"});

    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded.id;
        next();


    }catch{
        res.status(404).json({message:"invalid token"});
    }

};

//multer
const storage=multer.diskStorage({
    destination:"uploads/",
    filename:(req,file,cb)=>{
          cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload=multer({storage});

//routes

//register
app.post("/api/register",async(req,res)=>{
    const{name,email,password}=req.body;
    const existing=await user.findOne({email});
    if(existing) return res.json({message:"email already exists bro/sis"});

    const hashed=await bcrypt.hash(password,10);
    const newuser=new user({name,email,password:hashed});

    await newuser.save();
    res.json({ message: "Registered successfully" });
});

//login
app.post("/api/login",async(req,res)=>{
    const{email,password}=req.body;
    const users=await user.findOne({email});
    if(!users) return res.json({message:"user not found"});

    const match = await bcrypt.compare(password,users.password);
    if(!match) return res.json({message:"wrong password"});

    const token=jwt.sign({id:users._id},process.env.JWT_SECRET);
    res.json({token});

});

//listings
app.get("/api/listings",async(req,res)=>{
    const listings=await listing.find();
    res.json(listings);
});

app.get("/api/listings/:id",async(req,res)=>{
    const list=await listing.findById(req.params.id);
    if(!list) return res.json({message:"no listings found"});
     res.json(list);
})

//creating listing
app.post("/api/listings",upload.single("image"),async(req,res)=>{
    const{title,location,price,description}=req.body;
    const image=req.file?req.file.filename: null;

    const newlisting=new listing({
        title,location,price,description,image
    });

    await newlisting.save();
    res.json(newlisting);
    
})



    



//booking list
app.post("/api/bookings",auth,async(req,res)=>{
    const { listingId, checkin, checkout } = req.body;

    const bookings=new booking({
        user:req.user,
        listing:listingId,
        checkin,
        checkout
    });
    await bookings.save();
    res.json({message:"Booking succesfully"});
});

app.get("/api/bookings/my",auth,async(req,res)=>{
  const book=await booking.find({user:req.user}).populate("listing");
  res.json(book);
});
//admin login

app.post("/api/admin/login",(req,res)=>{
    const{email,password}=req.body;

    if(email==='gouravadmin@gmail.com' && password==='admin123'){
        const token=jwt.sign({role:'admin'},process.env.JWT_SECRET);
        res.json({token});
    }else{
           res.status(401).json({ message: "Invalid admin credentials" });
    }
});
//host
app.post("/api/host",async (req, res) => {
  const { name, contact, property, message } = req.body;

  if (!name || !contact || !property || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newRequest = new HostRequest({ name, contact, property, message });
  await newRequest.save();

  res.json({ message: "Your request has been submitted!" });
});


const PORT=process.env.PORT||3001
app.listen(PORT,'0.0.0.0',()=>{
    console.log(`server is running at ${PORT}`);
});