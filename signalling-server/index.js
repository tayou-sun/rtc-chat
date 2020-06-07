const express = require("express")
const webSocket = require("ws")
const http = require("http")
const uuid = require("uuid/v4")
const app = express()

const port = process.env.PORT || 9000

const server = http.createServer(app)
let users = {};

const sendTo = function(connection, message) {
    connection.send(JSON.stringify(message))
}
const sendToAll = function(clients, type, { id, name: userName }) {
    const client = clients[userName];

    if (client === undefined) {
        console.log("undefined client name");
        return;
    }

    Object.values(clients).forEach(x => {
        if (x.name !== userName) {
            x.send(Json.stringify({
                type,
                user: { id, userName }
            }))
        }
    });
    //console.log(clients);
}

const myOwnWebSocket = new webSocket.Server({ server })
myOwnWebSocket.on("connection", function(webSocket) {
    webSocket.on("message", function(msg) {
        console.log("Received message from client %s", msg);
        let data
        try {
            data = JSON.parse(msg);
        } catch (e) {
            console.log("Non-valid JSON")
            data = {}
        }

        const { type, name, offer, answer, candidate } = data
        switch (type) {
            case "login":
                if (users[name]) {
                    sendTo(webSocket, {
                        type: "login",
                        sucess: false,
                        message: "false"
                    })
                } else {
                    const id = uuid();
                    const loggedIn = Object.values(users).map(({ id, name: userName }) => ({ id, userName }));
                    users[name] = webSocket;
                    webSocket.name = name;
                    webSocket.id = id;
                    sendTo(webSocket, { type: "login", sucess: true, users: loggedIn });
                    sendToAll(users, "updated", webSocket);
                }
                break
            case "offer":
                if (!!users[name]) {
                    sendTo(users[name], { type: "offer", offer, name: webSocket.name })
                } else {
                    sendToAll(users, { type: "error" }, webSocket)
                }
                break
            case "answer":
                if (!!users[name]) {
                    sendTo(users[name], { type: "answer", answer })
                } else {
                    sendToAll(users, { type: "error" }, webSocket)
                }
                break
            case "candidate":
                if (!!users[name]) {
                    sendTo(users[name], { type: "candidate", candidate })
                } else {
                    sendToAll(users, { type: "error" }, webSocket)
                }
                break
            case "leave":
                delete users[webSocket.name]
                sendToAll(users, "leave", webSocket)
                break


            default:
                sendToAll(users, { type: "error" }, webSocket)
                break
        }
    })
    webSocket.send(
        JSON.stringify({
            type: "connect",
            message: "Hello there the angel of my nigthmare"
        })
    )

})

server.listen(port, function() {
    console.log(`SIGSERV run on port: ${port}`)
})