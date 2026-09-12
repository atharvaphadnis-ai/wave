const { app, BrowserWindow, shell } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
let server
function createWindow(){ const win = new BrowserWindow({width:1440,height:900,minWidth:390,minHeight:640,backgroundColor:'#101918',webPreferences:{contextIsolation:true,sandbox:true}}); win.loadURL(process.env.WAVE_URL || 'http://127.0.0.1:3000'); win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'}}) }
app.whenReady().then(()=>{ if(process.env.NODE_ENV!=='development'){server=spawn(process.execPath,[path.join(__dirname,'..','server','index.ts')],{env:{...process.env, ELECTRON_RUN_AS_NODE:'1'},stdio:'inherit'})}; createWindow(); app.on('activate',()=>BrowserWindow.getAllWindows().length===0&&createWindow()) })
app.on('window-all-closed',()=>{if(server)server.kill();if(process.platform!=='darwin')app.quit()})
