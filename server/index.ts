import path from "path";
import url from "url";
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import http from "http";
import https from "https";
import fs from "fs";
import webhookMessage from "./utils/webhookMessage";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(cookieParser())

function verifyLogin(token: string | undefined) {
    try {
        if (token && jwt.verify(token, process.env.jwt_secret + "", { algorithms: ["HS256"] })) {
            return true;
        }
    } catch(err) {
        return false;
    }
}

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


app.use("/api", apis);

app.use("/assets", express.static("../client/dist/assets/"));
app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
})

if (process.env.NODE_ENV == "production") {

    const options = {
        key: fs.readFileSync('/etc/letsencrypt/live/netsi.tk/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/netsi.tk/fullchain.pem')
    };

    http.createServer(app).listen(80);
    https.createServer(options, app).listen(443);

    webhookMessage("Server is online", "Server is online, listening at `netsi.tk`!", 65280)
} else {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

process.on('uncaughtException', function (err) {
    console.error(err.stack);

    var errorMessage = err.stack + ""
    if (!err.stack) {
        errorMessage = "No error stack found... weird."
    }

    webhookMessage("Server Error!", errorMessage, 16711680)
});