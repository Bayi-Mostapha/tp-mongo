require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'tp_products';

let db;
let client;

app.use(express.json());

async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connecté à MongoDB avec succès');
    console.log(`📦 Base de données: ${DB_NAME}`);
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

app.use((req, res, next) => {
  req.db = db;
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'API MongoDB - TP Products',
    endpoints: {
      products: '/api/products',
      stats: '/api/products/stats'
    }
  });
});

const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur', message: err.message });
});

async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📚 Documentation: http://localhost:${PORT}/`);
  });
}

process.on('SIGINT', async () => {
  console.log('\n⏹️  Arrêt du serveur...');
  if (client) {
    await client.close();
    console.log('✅ Connexion MongoDB fermée');
  }
  process.exit(0);
});

startServer();