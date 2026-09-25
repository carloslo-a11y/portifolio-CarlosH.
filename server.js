const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Única conta que pode editar o site.
// A mesma lista está em session.js (validação no navegador).
const ADMIN_EMAIL = 'carlosheitorcostalo@gmail.com';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  waitForConnections: true,
  connectionLimit: 10
};

async function initDatabase() {
  const conn = await mysql.createConnection(DB_CONFIG);

  await conn.query(
    'CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
  );
  await conn.query('USE auth_db');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      tipo VARCHAR(20) NOT NULL DEFAULT 'aluno',
      papel VARCHAR(20) NOT NULL DEFAULT 'viewer',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Mesmo administrador do site (a lista de admins fica em session.js).
  const ADMIN = {
    nome: 'Carlos Heitor Costalo',
    email: ADMIN_EMAIL,
    senha: '123456'
  };

  const [rows] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [ADMIN.email]);
  if (rows.length === 0) {
    const hashedPassword = await bcrypt.hash(ADMIN.senha, 10);
    await conn.query(
      'INSERT INTO usuarios (nome, email, senha, tipo, papel) VALUES (?, ?, ?, ?, ?)',
      [ADMIN.nome, ADMIN.email, hashedPassword, 'aluno', 'admin']
    );
    console.log(`  Administrador criado: ${ADMIN.email}`);
  }
  // Qualquer outra conta deste banco é somente de visualização.
  await conn.query(
    "UPDATE usuarios SET papel = 'viewer' WHERE email <> ?",
    [ADMIN.email]
  );

  await conn.end();
}

const pool = mysql.createPool({
  ...DB_CONFIG,
  database: 'auth_db'
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, tipo } = req.body;
    const tipoUsuario = (tipo === 'professor') ? 'professor' : 'aluno';

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // O e-mail do administrador é reservado.
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      return res.status(409).json({ error: 'Este e-mail é reservado ao administrador do portfólio.' });
    }

    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    // Toda conta nova nasce como 'viewer' (só visualização).
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha, tipo, papel) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hashedPassword, tipoUsuario, 'viewer']
    );

    res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    res.json({ message: 'Login realizado com sucesso!', user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('==========================================');
      console.log(`  Servidor rodando em http://localhost:${PORT}`);
      console.log(`  Login:    http://localhost:${PORT}/login.html`);
      console.log(`  Cadastro: http://localhost:${PORT}/cadastro.html`);
      console.log('  ------------------------------------------------');
      console.log('  Administrador (único que edita):');
      console.log(`    ${ADMIN_EMAIL} / 123456`);
      console.log('  Qualquer outra conta: somente visualização.');
      console.log('==========================================');
    });

  })
  .catch((err) => {
    console.error('Falha ao iniciar o banco de dados:', err.message);
    console.error('Verifique se o MySQL está rodando (serviço "mysql").');
    process.exit(1);
  });