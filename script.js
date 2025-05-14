require("dotenv").config()
const express=require("express")
const db=require("better-sqlite3")("sucrelite.db")
db.pragma("journal_mode=WAL")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const cookieParser=require("cookie-parser")
const sanitize = require("sanitize-html")
const morgan=require("morgan")

const app=express()
//structuring the database
const createTables=db.transaction(()=>{
    db.prepare(
        `
        CREATE TABLE IF NOT EXISTS  users(
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        )
        `
    ).run()
    db.prepare(
        `
        CREATE TABLE IF NOT EXISTS menu(
            menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL
        )
        `
    ).run()
    db.prepare(
        `
        CREATE TABLE IF NOT EXISTS orders(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(menu_id) REFERENCES menu(id)
        )
        `
    ).run()
    db.prepare(
        `
        CREATE TABLE IF NOT EXISTS reviews(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment TEXT NOT NULL
        )
        `
    ).run()
    db.prepare(
        `
        CREATE TABLE IF NOT EXIsTS payment(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_id INTEGER NOT NULL,
            total INTEGER NOT NULL,
            FOREIGN KEY(total) REFERENCES orders(total),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(order_id) REFERENCES orders(id)
        )
        `
    ).run()
})

createTables()

//use functions
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(morgan('dev'))

//get functions
app.get("/", (req,res)=>{
    res.sendFile(__dirname+"/frontend/index.html")
})
app.get("/login", (req,res)=>{
    res.sendFile(__dirname+"/frontend/login.html")
})
app.get("/signup", (req,res)=>{
    res.sendFile(__dirname+"/frontend/signup.html")
})
app.get("/menu&payment", (req, res) => {
    // Check if user is authenticated
    const token = req.cookies.appCookie;
    if (!token) {
        return res.redirect('/login');
    }

    try {
        // Verify the token
        jwt.verify(token, process.env.JWTSECURE);
        // If token is valid, serve the payment page
        res.sendFile(__dirname + "/frontend/payment.html");
    } catch (error) {
        // If token is invalid, redirect to login
        res.redirect('/login');
    }
});
app.get("/about-us", (req,res)=>{
    res.sendFile(__dirname+"/frontend/about.html")
})
app.get("/contact",(req)=>{
    res.sendFile(__dirname+"/frontend/contact.html")
})

// post functions
app.post("/signup", (req,res)=>{
    const errors=[]
    let email=req.body.email
    let username=req.body.username
    let password=req.body.password

    if( typeof email!="string") email=""
    if( typeof username!="string") username=""
    if( typeof password!="string") password=""
    email=email.trim()
    username=username.trim()
    password=password.trim()

    if(!email || !username||!password)errors.push("Please fill all the fields")
    if(email&&!email.includes('@kyu.ac.ke'))errors.push("Please use a kyu email")
    if(username.length<3) errors.push("Username must be at least 3 characters")
    if(password.length<8) errors.push("Password must be at least 8 characters")
    
    if(errors.length>0){
        return res.status(400).json({errors})
    }

    //check if the email already exists
    const checkIfUserExists=db.prepare("SELECT *FROM users WHERE email=?")
    const obtained=checkIfUserExists.get(email)
    if (obtained) {
        return res.status(400).json({errors:["Email already exists"]})
    }

    //password hashing and storing into the database
    const hashedPassword=bcrypt.genSaltSync(10)
    const newPassword=bcrypt.hashSync(password,hashedPassword)
    const storeUser=db.prepare("INSERT INTO users (username,email,password) VALUES(?,?,?)")
    const newUser=storeUser.run(username,email,newPassword)

    const getUser=db.prepare("SELECT * FROM users WHERE email=?")
    const obtainedUser=getUser.get(email)
    if(!obtainedUser){
        return res.status(400).json({errors:["Failed to create user"]})
    }

    // Create JWT token using the newly created user's data
    const token=jwt.sign(
        {username: obtainedUser.username},
        process.env.JWTSECURE,
        {expiresIn: '12h'}
    )

    res.cookie("appCookie",token,{
        maxAge:1000*60*60*12,
        httpOnly:true,
        //secure:true,
        sameSite:"strict"
    })

    return res.status(200).redirect("/menu&payment")
})
//login function
app.post("/login", (req,res)=>{
    let errors=[]
    let email=req.body.email
    let username=req.body.username
    let password=req.body.password

    if( typeof email!="string") email=""
    if( typeof username!="string") username=""
    if( typeof password!="string") password=""
    email=email.trim()
    username=username.trim()
    password=password.trim()

    if(!email || !username||!password)errors=["Invalid username,email/password"]
    if(email&&!email.includes('@kyu.ac.ke'))errors=["Invalid username,email/password"]
    if(username.length<3) errors=["Invalid username,email/password"]
    if(password.length<8) errors=["Invalid username,email/password"]
    
    if(errors.length>0){
        return res.status(400).json({errors})
    }

    const getUser=db.prepare("SELECT *FROM users WHERE email=?")
    const obtainedUser=getUser.get(email)
    if (!obtainedUser) {
        return res.status(400).json({errors:["Invalid username,email/password"]})
    }
    const passwordCompare=bcrypt.compareSync(password,obtainedUser.password)
    if(!passwordCompare){
        return res.status(400).json({errors:["Invalid username,email/password"]})
    }
    const token=jwt.sign(
        {username: obtainedUser.username},
        process.env.JWTSECURE,
        {expiresIn: '12h'}
    )

    res.cookie("appCookie",token,{
        maxAge:1000*60*60*12,
        httpOnly:true,
        //secure:true,
        sameSite:"strict"
    })

    return res.status(200).redirect("/menu&payment")

})
app.listen(3000,()=>{
    console.log("server is running")
})