require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET minimal 32 karakter di .env');
}

const app = require('./app');
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Backend parkir berjalan di http://localhost:${port}`);
});
