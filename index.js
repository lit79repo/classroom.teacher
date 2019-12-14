const { app, BrowserWindow, ipcMain } = require('electron');
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');
const { exec } = require('child_process');
const { join } = require("path");
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const uuid = require("uuid/v1");

const { userInfo } = require("os");

const adapter = new FileSync(userInfo().homedir + "/cfg.json");
const db = low(adapter);
db.defaults({ config: { classroom: "206" } }).write();
console.log(db.get('config.classroom').value());

const net = new Network({ name: db.get('config.classroom').value() });
const express = require("express");
const api = express();


let machines = [];
let mainWindow;

let createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1000,
        minWidth: 1000,
        height: 600,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
        },
        autoHideMenuBar: true,
        zoomFactor: 2
    });
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.on('closed', function () {
        mainWindow = null;
        process.exit();
    });
}

app.on('ready', () => {
    createWindow();
});


app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
});

net.addTransport(new TCPTransport());

net.on('node:available', node => {
    // console.log('New Machine:', node.id);
    node.send("classroom")
});

net.on('message', msg => {
    //   console.log('A message was received', msg.type, 'with data', msg, 'from', msg.returnPath.id);
    if (msg.type === "myInfo") machines.push(msg.data); machines = Array.from(new Set(machines));
});

api.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});

api.get("/machines", (req, res) => res.json(machines));

api.get("/vnc/:machine", (req, res) => {
    const { machine } = req.params;
    console.log(`vnc.bat ${machine}`);
    exec(`"C:/Program Files/TightVNC/tvnviewer.exe" -host=${machine} -password=tetris`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`${stdout}`);
        console.error(`${stderr}`);
    });
    res.end();
})


api.on('ready', () => {
    createWindow();
});


api.get("/room", (req, res) => {
    res.send(db.get('config.classroom').value());
})

api.get("/setRoom", (req, res) => {
    if (req.query.room) db.set('config.classroom', req.query.room).write();
    process.exit();
})


api.use("/", express.static(join(__dirname, "static")));
api.use("/lib", express.static(join(__dirname, "node_modules")));

api.listen(8080, () => {
    net.start();
})

