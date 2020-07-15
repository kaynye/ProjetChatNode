const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('abcd');

db.serialize(function() {
  db.run("CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE,name TEXT,email TEXT, score INTEGER, color TEXT,password TEXT)");
});
