const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');
const { exec } = require('child_process');
const { join } = require("path");
const { saveSnapshot } = require("vnc-snapshot");
const uuid = require("uuid/v1");

const net = new Network({ name: '206' });

const express = require("express");
const app = express();
let machines = [];

net.addTransport(new TCPTransport());

net.on('node:available', node => {
    console.log('New Machine:', node.id);
});

net.on('message', msg => {
    //   console.log('A message was received', msg.type, 'with data', msg, 'from', msg.returnPath.id);
    if (msg.type === "myInfo") machines.push(msg.data);
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

app.get("/machines", (req, res) => res.json(machines));

app.get("/vnc/:machine", (req, res) => {
    const { machine } = req.params;
    console.log(`vnc.bat ${machine}`);
    exec(`vnc.bat ${machine}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`${stdout}`);
        console.error(`${stderr}`);
    });
    res.end();
})

/*app.get("/vncview/:machine", (req, res) => {
    const { machine } = req.params;
    saveSnapshot(uuid()+'.png', {host:machine, password:"tetris"}).then((filePath) => {
    res.sendFile(filePath);
  })
    res.end();
})*/


app.get("/vncview/:machine", (req, res) => {
    const { machine } = req.params;
    res.end();
});


app.use("/", express.static(join(__dirname, "static")));
app.use("/lib", express.static(join(__dirname, "node_modules")));

app.listen(8080, () => {
    net.start();
    exec("start http://localhost:8080");
})

