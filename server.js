import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const files={'/':'index.html','/index.html':'index.html','/src/app.js':'src/app.js','/src/api.js':'src/api.js','/src/mock.js':'src/mock.js','/src/style.css':'src/style.css'};
http.createServer(async(req,res)=>{const f=files[new URL(req.url,'http://localhost').pathname];if(!f){res.writeHead(404);return res.end('Not found')}try{const data=await readFile(fileURLToPath(new URL(f,import.meta.url)));res.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data)}catch{res.writeHead(500);res.end('Server error')}}).listen(5173,'localhost',()=>console.log('Frontend: http://localhost:5173'));
