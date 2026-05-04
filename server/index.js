const app = require('./app');

const PORT = process.env.PORT || 9464;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Blog server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
