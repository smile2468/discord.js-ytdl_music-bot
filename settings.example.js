module.exports = {
    bot: {
      token: 'Secret Token',
      prefix: '!',
      owners: ['12345678910']
    },
    db: {
      mongo: {
        url: 'mongodb://localhost:27017/yourmongodbdatabase',
        user: 'yourmongodbuser',
        password: 'yourmongodbpassword',
        options: { useNewUrlParser: true, useUnifiedTopology: true, user: 'yourmongodbuser', pass: 'yourmongodbpassword' }
      }
    }
  }
  