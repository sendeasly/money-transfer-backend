const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:3001'
}));
app.use(express.json());

// Unganisha database
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Thibitisha database inafanya kazi
db.connect((err) => {
  if (err) {
    console.log('Hitilafu ya database:', err.message);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
  } else {
    console.log('Database imeunganishwa!');
  }
});

// Route ya majaribio
app.get('/', (req, res) => {
  res.json({ ujumbe: 'Seva inafanya kazi!' });
});

// Route ya kusajili
app.post('/sajili', async (req, res) => {
  const { jina, email, nywila } = req.body;

  try {
    // Angalia kama email tayari ipo
    const yupo = await db.query(
      'SELECT * FROM watumiaji WHERE email = $1',
      [email]
    );

    if (yupo.rows.length > 0) {
      return res.status(400).json({ kosa: 'Email tayari imesajiliwa!' });
    }

    // Simba nywila
    const nywilaSimbwa = await bcrypt.hash(nywila, 10);

    // Hifadhi mtumiaji
    const mpya = await db.query(
      'INSERT INTO watumiaji (jina, email, nywila) VALUES ($1, $2, $3) RETURNING id, jina, email',
      [jina, email, nywilaSimbwa]
    );

    res.json({
      ujumbe: 'Umesajiliwa!',
      mtumiaji: mpya.rows[0]
    });

  } catch (err) {
    console.log('Kosa:', err.message);
    res.status(500).json({ kosa: 'Tatizo la seva!' });
  }
});

// Route ya kuingia
app.post('/ingia', async (req, res) => {
  const { email, nywila } = req.body;

  try {
    // Tafuta mtumiaji
    const jibu = await db.query(
      'SELECT * FROM watumiaji WHERE email = $1',
      [email]
    );

    if (jibu.rows.length === 0) {
      return res.status(400).json({ kosa: 'Email au nywila si sahihi!' });
    }

    const mtumiaji = jibu.rows[0];

    // Angalia nywila
    const nywilaSawa = await bcrypt.compare(nywila, mtumiaji.nywila);
    if (!nywilaSawa) {
      return res.status(400).json({ kosa: 'Email au nywila si sahihi!' });
    }

    // Tengeneza token
    const token = jwt.sign(
      { id: mtumiaji.id, email: mtumiaji.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ujumbe: 'Umeingia!',
      token,
      mtumiaji: {
        id: mtumiaji.id,
        jina: mtumiaji.jina,
        email: mtumiaji.email
      }
    });

  } catch (err) {
    console.log('Kosa:', err.message);
    res.status(500).json({ kosa: 'Tatizo la seva!' });
  }
});

// Route ya kutuma pesa
app.post('/tuma', async (req, res) => {
  const { mtumiaji_id, kiasi, kutoka, kwenda, mpokeaji_kiasi, ada } = req.body;

  try {
    const muamala = await db.query(
      `INSERT INTO miamala 
       (mtumiaji_id, kiasi, kutoka, kwenda, mpokeaji_kiasi, ada) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [mtumiaji_id, kiasi, kutoka, kwenda, mpokeaji_kiasi, ada]
    );

    res.json({
      ujumbe: 'Pesa imetumwa!',
      muamala: muamala.rows[0]
    });

  } catch (err) {
    console.log('Kosa:', err.message);
    res.status(500).json({ kosa: 'Tatizo la seva!' });
  }
});

// Route ya historia
app.get('/historia/:mtumiaji_id', async (req, res) => {
  const { mtumiaji_id } = req.params;

  try {
    const historia = await db.query(
      'SELECT * FROM miamala WHERE mtumiaji_id = $1 ORDER BY tarehe DESC',
      [mtumiaji_id]
    );

    res.json({ historia: historia.rows });

  } catch (err) {
    console.log('Kosa:', err.message);
    res.status(500).json({ kosa: 'Tatizo la seva!' });
  }
});

// Anza seva
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Seva inaendesha kwenye port ${PORT}`);
});