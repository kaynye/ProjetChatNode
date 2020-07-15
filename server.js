	// Initialisation des Modules
var http = require('http');
var express = require('express');
var path = require('path');
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('abcd');
//db.close();

var fs = require('fs');


// declaration session
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
// initialisation des routes
var app = express();
app.use(session);
//app.use(express.static(__dirname, '/static'));
app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res) {

	if (req.session.userdata) {
		res.redirect('/chat');
	}else{
	res.render('index.ejs');
	}
}).get('/chat',	 function(req, res) {
	if (req.session.userdata) {
    res.render('chat.ejs');
	}else{
		res.redirect('/');
	}
}).get('/inscription',	 function(req, res) {
	if (req.session.userdata) {
    res.render('chat.ejs');
	}else{
		res.render('inscription.ejs');
	}
}).use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.status(404).send('Page introuvable !');
});

let dialogue=[];
let listeConnecter=[];

var server = require('http').Server(app);


class User {
  constructor(nom,score,id) {
    this.nom = nom;
	this.score=score;
	this.color="#FFFFFF";
	this.id=id;
  }
}

class UserA {
  constructor(nom,score,color) {
    this.nom = nom;
	this.score=score;
	this.color=color;
  }
}

class Message {
  constructor(nom, message,color) {
    this.nom = nom;
    this.message = message;
	this.color=color;
  }
}

let xPoint=Math.floor((Math.random() * 480) + 1);
let yPoint=Math.floor((Math.random() * 320	) + 1);
var paddleHeight = 10;
var paddleWidth = 20;
let statusPoint=1;
let listJOne=[]
////connexion IO Server
var io = require('socket.io')(server);
io.use(sharedsession(session));
io.sockets.on('connection', function (socket) {
	 socket.on("login", function(name,pass) {

		 req="SELECT * FROM user where username='"+name+"' and password='"+pass+"'";
		 console.log(req);

		 db.each(req, function(err, user) {
			 console.log(err);
			 console.log("bon");
			 if (user){
			  console.log("User id : "+user.id, user.username);
			  console.log(user);
			socket.handshake.session.userdata = user.username;
			//socket.join(user.username);
			socket.handshake.session.color = user.color;
			socket.handshake.session.trouv = false;
			console.log(socket.handshake.session);
			socket.handshake.session.save();
			listeConnecter.push(new User(user.username,user.score,socket.handshake.session.id));
			socket.emit('redirect');
			socket.broadcast.emit('refeshCo',listeConnecter);
			envoiPoint =setInterval(function (){//definie le placement des points
				xPoint=Math.floor((Math.random() * 480) + 1);
				yPoint=Math.floor((Math.random() * 320	) + 1);
				socket.broadcast.emit("newPoint",xPoint,yPoint);
				socket.emit("newPoint",xPoint,yPoint);
			}, 10000);
			 }
			 socket.handshake.session.trouv = false;
		  });
		  console.log(socket.handshake.session.trouv);
		  if(socket.handshake.session.trouv!=null){
			  socket.emit('message',"identifiant ou mot de passe incorrect");
		  }

    });

    socket.on('register', function (table) {//create User
  		var stmt = db.prepare("INSERT INTO user (username,name,email,score,color,password) VALUES (?,?,?,?,?,?)");
  		stmt.run(table["username"],table["name"],table["email"],0,"#FFFFFF",table["password"])
  		stmt.finalize();
		socket.handshake.session.userdata=table["username"];
		console.log(socket)
		socket.emit("redirect");
  	});

  	socket.on('envoiMsg', function (msg) {//lorsqu'un client envoi un nouveau msg
		message = new Message(socket.handshake.session.userdata,msg,socket.handshake.session.color);
		console.log(socket.handshake.session.color);
		dialogue.push(message);
		socket.broadcast.emit('newMsg',dialogue);
		io.sockets.emit('newMsg', dialogue);
	});

	socket.on('getPage', function (nom) {// redirige vers le chat
			socket.emit('getPage',socket.handshake.session.userdata,dialogue);
	});
	socket.on('refeshCo', function (nom) {// recuper la liste des personne connecter
			console.log("des personnes ce co");
			socket.broadcast.emit('refeshCo',listeConnecter);
			socket.emit('refeshCo',listeConnecter);

	});

  socket.on("logout", function() {//deconnecxion
      if (socket.handshake.session.userdata) {
    for(let i=0;i<listeConnecter.length;i++){
      if (listeConnecter[i].nom==socket.handshake.session.userdata){
      listeConnecter.splice( i, 1 );
      }
    }
          delete socket.handshake.session.userdata;
          delete socket.handshake.session.trouv;
          socket.handshake.session.save();
    socket.broadcast.emit('refeshCo',listeConnecter);
      }
  });

  socket.on('changeColor', function (newColor) {//Changer a couleur de texte
		for(let i=0;i<listeConnecter.length;i++){
				if (listeConnecter[i].nom==socket.handshake.session.userdata){

								  listeConnecter[i].color=newColor;

								socket.handshake.session.color=newColor;
								var reqCol="UPDATE  user SET color = '"+newColor+"' WHERE username ='"+socket.handshake.session.userdata+"'";
								db.run(reqCol);


				}
			}
	});

  socket.on('getTable', function (newColor) {//Changer a couleur de texte
    req="SELECT * FROM user";
    console.log(req);
    listeUser=[];
    db.each(req, function(err, user) {
      if (user){

     listeUser.push(new UserA(user.username,user.score,user.color));
     console.log(listeUser);
     socket.emit("table",listeUser);
      }
     });

	});
	
	socket.on('connectOneForOne', function () {//connect User
		console.log("init game");
		//socket.emit("initOneForOne");
		socket.emit("getCoordon",240,310);
		socket.handshake.session.OneForOne={x:240,y:310,username:socket.handshake.session.userdata};
		console.log(socket.handshake.session.OneForOne);
		listJOne.push(socket.handshake.session.OneForOne);
		//socket.handshake.session.OneForOne.x=310;
		//socket.emit("tesCoordonnée","bonjour");
		console.log(socket);
		console.log(socket.handshake.session.OneForOne.x);
		console.log(socket.handshake.session.OneForOne.y);
		
	});
	function toucherPoint () {//victoire en OneForOne
		newScore=200;
		clearInterval(envoiPoint);
		listJOne=[];
								setTimeout(function(){ 
										envoiPoint =setInterval(function (){//definie le placement des points
										xPoint=Math.floor((Math.random() * 480) + 1);
										yPoint=Math.floor((Math.random() * 320	) + 1);
										socket.broadcast.emit("newPoint",xPoint,yPoint);
										socket.emit("newPoint",xPoint,yPoint);
										statusPoint=1;
									}, 10000);									
								}, 5000);
		reqS="SELECT score FROM user WHERE username='"+socket.handshake.session.userdata+"'";
		console.log(reqS);
			db.each(reqS, function(err, user) {
			  if (err) {
				 console.log(err);
				throw err;
			  }
			  let score=user.score;
			  score+=newScore;
			  var reqNS="UPDATE  user SET score = "+score+" WHERE username ='"+socket.handshake.session.OneForOne.username+"'";
			  for(let i=0;i<listeConnecter.length;i++){
				  if (listeConnecter[i].nom==socket.handshake.session.userdata){
				  listeConnecter[i].score=score;
				  }
				}
			  db.run(reqNS);
			  socket.emit("newScore",score);
		  });
	};
	socket.on('mouve', function (direction) {//create User
			if (direction=="haut"){
				if( socket.handshake.session.OneForOne.y > 0)
					socket.handshake.session.OneForOne.y-=1;
		}
		else if (direction=="bas"){
			if( socket.handshake.session.OneForOne.y < 320-paddleHeight)
			socket.handshake.session.OneForOne.y+=1
			}
		else if (direction=="gauche"){
			if( socket.handshake.session.OneForOne.x > 0)
			socket.handshake.session.OneForOne.x-=1
			}
		else if (direction=="droite"){
			if( socket.handshake.session.OneForOne.x < 480-paddleWidth)
			socket.handshake.session.OneForOne.x+=1
			}
		if(statusPoint==1){
			if(xPoint > socket.handshake.session.OneForOne.x && xPoint <socket.handshake.session.OneForOne.x+20 && yPoint>socket.handshake.session.OneForOne.y && yPoint<socket.handshake.session.OneForOne.y+10) {
								statusPoint = 0;
								toucherPoint();
								socket.broadcast.emit("message",socket.handshake.session.userdata+" gagne");
			}				
		}
	});
	socket.on("getJoueur",function(){socket.emit("getJoueur",listJOne)});
	socket.on('getCoordon', function () {//create User
		socket.emit("getCoordon",socket.handshake.session.OneForOne.x,socket.handshake.session.OneForOne.y);
	});
	socket.on('clearOneForOne', function () {//create User
		for (let joueur=0;joueur<listJOne.length;joueur++){
				  if(listJOne[joueur].username==socket.handshake.session.userdata){
					  //listJOne[joueur].score+=newScore;
					  listJOne.splice(joueur,1)
				  }
			  }
	});
	
	socket.on('addScore', function (newScore) {//modifier le score à la fin d 'un jeu
		reqS="SELECT score FROM user WHERE username='"+socket.handshake.session.userdata+"'";
		console.log(reqS);
		console.log(socket.handshake.session.userdata);
			db.each(reqS, function(err, user) {
			  if (err) {
				 console.log(err);
				throw err;
			  }
			  score=user.score;
			  score+=newScore;
			  var reqNS="UPDATE user SET score = "+score+" WHERE username ='"+socket.handshake.session.userdata+"'";
			  
			  for (let membre=0;membre<listeConnecter.length;membre++){
				  if(listeConnecter[membre].nom==socket.handshake.session.userdata){
					  listeConnecter[membre].score+=newScore;
				  }
			  }
			  socket.emit("newScore",score);	
			  db.run(reqNS);
		  });
	});

})

server.listen(8000);
