import bcrypt from "bcrypt";
import express, { Request, Response } from "express";
import http from "http";
import jwt from "jsonwebtoken";
import verifyLogin from "./utils/verifyLogin";
import sqlite3 from "sqlite3";

// API ROUTES
const apis = express.Router();

// USERS
const userList = JSON.parse(process.env.users || "{}")

apis.post("/login", (req: Request, res: Response) => {
    if (userList.hasOwnProperty(req.body.username)) {
        bcrypt.compare(req.body.password, userList[req.body.username])
            .then(resolve => {
                if (resolve) {
                    res.status(200);
                    res.cookie("token", jwt.sign({ username: req.body.username, perms: "member" }, process.env.jwt_secret + "", { algorithm: "HS256", expiresIn: "7d" }), { httpOnly: true, secure: true, sameSite: "strict" })
                    res.send("success");
                    res.end();
                } else {
                    res.status(401);
                    res.end("bad auth");
                    return;
                }
            })
            .catch(reject => {
                console.error(reject);
                res.status(500);
                res.end("server error");
                return;
            })
    } else {
        res.status(401);
        res.end("bad auth");
        return;
    }
})

let monData: { data: string, headers: http.IncomingHttpHeaders }[] = [];
apis.all("/monitor", (req, res) => {
    let req2str = `${req.method} ${req.path} Cookies: ${JSON.stringify(req.cookies)} Body: ${JSON.stringify(req.body)}`;
    monData.push({ data: req2str, headers: req.headers });

    res.status(200);
    res.end("request logged");
})

apis.get("/login", (req, res) => {
    if (verifyLogin(req.cookies.token)) {
        res.status(200);
        res.end("success");
        return;
    } else {
        res.status(401);
        res.end("bad auth");
        return;
    }
})

apis.get("/logout", (req, res) => {
    res.status(200);
    res.clearCookie("token");
    res.end("success");
    return;
})

apis.get("/status", (req, res) => {
    res.status(200);
    res.end("pong");
});

const db = new sqlite3.Database(".db", (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Connected to the database.");
});

// create ctfs table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS ctfs( 
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL)`, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("Created ctfs table.");
});


apis.post("/ctfs/add", (req, res) => {
    // adds a new ctf
    if (verifyLogin(req.cookies.token)) {
        db.run("INSERT INTO ctfs (name, description) VALUES (?, ?)", [req.body.name, req.body.description], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    res.status(409);
                    res.end("ctf already exists");
                    return;
                }
                console.error(err);
                res.status(500);
                res.end("server error");
                return;
            }
            res.status(200);
            res.end("success");
            return;
        })
    }
    else {
        res.status(401);
        res.end("bad auth");
        return;
    }
})

apis.get("/ctfs/list", (req, res) => {
    // lists all ctfs
    if (verifyLogin(req.cookies.token)) {
        db.all("SELECT name FROM ctfs", [], (err, rows) => {
            if (err) {
                console.error(err);
                res.status(500);
                res.end("server error");
                return;
            }
            res.status(200);
            res.json(rows);
            return;
        })
    }
})

export default apis;