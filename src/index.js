const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const exphbs = require('express-handlebars'); //Para usar plantillas
const path = require('path');               //Para manejar directorios, basicamente unirlos 
const flash = require('connect-flash');  //Para mostar mensajes
const session = require('express-session'); //Lo necesita el flash tb
const  MySQLstore= require('express-mysql-session'); // para poder guardar la sesion en la sql
const passport = require('passport');
const {database} =require('./keys');
var Vue = require("vue").default;

//Initialization
const app = express();
require('./lib/passport'); //para que se entere de la autentificacion que se ha crea do 

//Settings
app.set('port',process.env.PORT || 4000);
app.set('views', path.join(__dirname,'views'));
app.engine('.hbs', exphbs.engine({  //con esto se configura el app.engine
    defaultLayout: 'main',
    layoutDir: path.join(app.get('views'),'layouts'),
    partialsDir: path.join(app.get('views'),'partials'),
    extname: '.hbs',
    helpers: require('./lib/handlebars') //no hay nada aun
}));
app.set('view engine','.hbs'); //PAra utilizar el app.engine


//Middleware
app.use(session({
    secret: 'mysesion',
    resave: false,
    saveUninitialized:false,
    store: new MySQLstore(database)
}))
app.use(flash());       // Para poder usar el middleware de enviar mensajes popups
app.use(morgan('dev'));
app.use(express.urlencoded({extended:false})); //aceptar los datos desde los formularios sin aceptar imagenes ni nada raro
app.use(express.json()); //Para enviar y recibir jsons.
app.use(passport.initialize()); //iniciar passport
app.use(passport.session());    //para que sepa donde guardar y como manejar los datos



const almacenar=multer.diskStorage({
    destination: (req,file,cb)=>{
       
        console.log("1: "+JSON.stringify(req.body));
        const {nif} = req.body;
        const {user} = req.body;
        //Si usuario es undefined es que se subió una baliza, y configuro el storage para balizas
        if (typeof user === 'undefined') {
            const dir = path.join(__dirname,'public/img/imagenes/',nif);
         
            fs.exists(dir, exist => {
            if (!exist) {
              return fs.mkdir(dir, error => cb(error, dir));
            }
            return cb(null, dir);
            })
        }else{//si no, entonces es una foto de perfil y va a otra carpeta
               const dir = path.join(__dirname,'public/img/profiles/');
               return cb(null, dir);
        }

    },
    filename:(req,file,cb) =>{
        const {nif} = req.body;
        const {user} = req.body;
        //Lo mismo para el nombre del archivo
        if (typeof user === 'undefined') {
            //Si es una baliza mantengo el nombre original del archivo
            cb(null,file.originalname);
        }else{
            //si es una foto de perfil la cuardo con el nombre del usuario
            cb(null,user+"."+file.originalname.split(".").pop());
        }
    }
});


app.use(multer({
    storage: almacenar,
    limits:{fileSize:3000000,}
  }).single('imagen'));



//Variables globales

app.use((req,res,next) =>{
    app.locals.signupMessage = req.flash('signupMessage');
    app.locals.success = req.flash('success');
    app.locals.message = req.flash('message');
    app.locals.user = req.user;
    next();
});

//Routes
app.use(require('./routes')); //busca automaticamente el archivo index.js
app.use(require('./routes/authentication'));
app.use('/balizas',require('./routes/balizas')); //ruta de las balizas. siempre precedido por el primer argumento '/balizas' 
app.use(require('./routes/api'));

//Public
app.use(express.static(path.join(__dirname,'public')));

//Starting
app.listen(app.get('port'),()=>{
    console.log("Running on http://localhost:4000", app.get('port'));
})