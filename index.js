const { app, BrowserWindow, ipcMain } = require('electron');
const Network = require('ataraxia');
const TCPTransport = require('ataraxia-tcp');
const { exec } = require('child_process');
const { join } = require("path");
// const { saveSnapshot } = require("vnc-snapshot");
// const uuid = require("uuid/v1");

const net = new Network({ name: '206' });
const express = require("express");
const api = express();

let machines = [];
let mainWindow;

let createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
        autoHideMenuBar: true
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
    console.log('New Machine:', node.id);
});

net.on('message', msg => {
    //   console.log('A message was received', msg.type, 'with data', msg, 'from', msg.returnPath.id);
    if (msg.type === "myInfo") machines.push(msg.data);
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

api.on('ready', () => {
    createWindow();
});

api.get("/vncview/:machine", (req, res) => {
    const { machine } = req.params;
    res.end();
});


api.use("/", express.static(join(__dirname, "static")));
api.use("/lib", express.static(join(__dirname, "node_modules")));

api.listen(8080, () => {
    net.start();
    exec("start http://localhost:8080");
})

