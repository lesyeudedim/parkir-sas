const pool = require('../../database/db');
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => {throw new HttpError(status,message)};
const asyncHandler = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
async function logActivity(id, activity, conn=pool) {
 if (id) await conn.query('INSERT INTO tb_log_aktivitas (id_user,aktivitas) VALUES (?,?)',[id, String(activity).slice(0,100)]);
}
function positiveInt(x, name) {const n=Number(x); if(!Number.isSafeInteger(n)||n<1) fail(400,`${name} harus bilangan bulat positif`);return n;}
function nonNegativeInt(x,name) {const n=Number(x);if(!Number.isSafeInteger(n)||n<0) fail(400,`${name} harus bilangan bulat >= 0`);return n;}
function requiredString(x,name,max=100) {if(typeof x!=='string'||!x.trim()||x.trim().length>max) fail(400,`${name} wajib diisi (maks ${max} karakter)`);return x.trim();}
module.exports={HttpError,fail,asyncHandler,logActivity,positiveInt,nonNegativeInt,requiredString};
