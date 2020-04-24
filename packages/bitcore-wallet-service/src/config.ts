module.exports = {
  basePath: '/bws/api',
  disableLogs: false,
  port: 3232,

  // Uncomment to make BWS a forking server
  // cluster: true,

  // Uncomment to set the number or process (will use the nr of availalbe CPUs by default)
  // clusterInstances: 4,

  // https: true,
  // privateKeyFile: 'private.pem',
  // certificateFile: 'cert.pem',
  ////// The following is only for certs which are not
  ////// trusted by nodejs 'https' by default
  ////// CAs like Verisign do not require this
  // CAinter1: '', // ex. 'COMODORSADomainValidationSecureServerCA.crt'
  // CAinter2: '', // ex. 'COMODORSAAddTrustCA.crt'
  // CAroot: '', // ex. 'AddTrustExternalCARoot.crt'

  storageOpts: {
    mongoDb: {
      uri: 'mongodb://localhost:27017/bws'
    }
  },
  messageBrokerOpts: {
    //  To use message broker server, uncomment this:
    messageBrokerServer: {
      url: 'http://localhost:3380'
    }
  },
  blockchainExplorerOpts: {
    btc: {
      livenet: {
        url: 'https://api.bitcore.io'
      },
      testnet: {
        url: 'https://api.bitcore.io',
        regtestEnabled: false
      }
    },
    bch: {
      livenet: {
        url: 'https://api.bitcore.io'
      },
      testnet: {
        url: 'https://api.bitcore.io'
      }
    },
    eth: {
      livenet: {
        url: 'https://api-eth.bitcore.io'
      },
      testnet: {
        url: 'https://api-eth.bitcore.io'
      }
    },
    xrp: {
      livenet: {
        url: 'https://api-xrp.bitcore.io'
      },
      testnet: {
        url: 'https://api-xrp.bitcore.io'
      }
    },
    socketApiKey: 'socketApiKey'
  },
  pushNotificationsOpts: {
    templatePath: 'templates',
    defaultLanguage: 'en',
    defaultUnit: 'btc',
    subjectPrefix: '',
    pushServerUrl: {
      url: 'fcm.googleapis.com/v1/projects/',
      projectId: 'bluebiz-cafd5',
      path: '/messages:send'
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    authorizationKey: {
      type: 'service_account',
      project_id: 'bluebiz-cafd5',
      private_key_id: '412937c4ed32508747d717314fa84478e5cbcdc6',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCP+97rD0wZuM28\nEkfFxUq/437V30Ps6myOa1HshS67V7nqKZu4nMk3wx5ac+VMLuKLEDexL+P4FKHv\nVlKjnS4ivliHW/NPK6O6yyXOs8BwA2kAguI8KCXknh9+FZ+JbADBUo2dwRBYhq7u\nZsTFVj3kfoVUwMttyIMFv/jeli8G2XHozcOqWjj9q6mWCs85mEtwa8AbdVVrSFwG\nfv+MnOHF5OyiA6aLdmxzHVVJVUFVnkpo8sk9Yu7Fk99lp/dwVpstX5GTBAwtwS4R\n9TixMcxQ1i00SqL0JDvm6lDcRkzkG1UiU4a1Utt8AEJig6m5ERJYTKBmz/2yKQxJ\nR6ie/HulAgMBAAECggEAG7VY3NuAxaJu1TafYUvqaqsZCYeBxuIGKhI1HdMzfxIO\n0SVYtlpVzslZ2gZbpiGPrztbvFl/AYrW7vwpwxrIeh8vYj0rwZygUZ4ulGy7J9NA\nLb0CVJlVUX2sidMXdJa4PnvojOdOgfrJR0+3plJGbuZ6Oikv/NyNelnLRuqX+jUs\naOtuiSs4t4Hs9OApRdC+6/mcd6omuMZskaaMc26evZgiNY/0W1+Ym0n8Rosm9sHU\nyfLbJiZbJnXb/xivOuELnO4PGsHEYE5C6lKl0QZUnu64Ffb2rIoKyTJUiWeqVTri\nOqW4UF2RqzGho130wYZWiIhXnDa1LtyeSd8Fs4wXMQKBgQDHLatDVGjE3z4XMbfz\n88CwbVJk32cL2qgrq/x9mkSCxfCkR8pE95ctTGDZZEC5ioFqHYKiKW4amVahoeYx\nVYpBqga0zGAGqHf0ltBvmXF/QvIbsOb+8aQg+fgWkKOsiBdbPO6p0bCiSp8I7UNV\nvpoVT0SQMhBjkznDdbuH530JqwKBgQC5D0Dg3IZSh+y1vCa5sz+t6lMTRaog6McN\nhTwm+IjhTziRzBfkEVDBFPvSrcy5xO0QHx07mWgDvCxNqLS8XtT8lrfbYQ0aLsMx\nBnA15bvNUBOBOGL6aKBFZ5r95MKfH5VnJm4jzyKMJ/nErtMz6vm1Clp4hvMMu5mF\nlsnsif5f7wKBgEWhapD0Llg87xjusa9gFInY/gfzrbOQMmBqFK/YQYEyL6lOy6CG\nqdwVKnp1OMdka0+sl2GXeD1mQ8nnrnCqxdWk2glUtXE+bgkcvCt3ih0CS19w3aBc\n25MHsDo7QGzterTTvV+yxbxGuAhH4dVU98rhVkfOqLoW2wfA3dlqDOVXAoGBAJB+\nY3bvWQXp0Z5YyZfnaIo/0xvSIjNN7dYVuNDo79+UfqQASosuJfKMks9+GsLWCw+y\na53Uew2niKQeXPhTx1NtzyLA1X0jFA8catL6jLeTlZco0seYl8N5UOB7FKcv/vSq\nYgcdvWjX8cJriscX6l88NUW0gOPpOsa+5O0HFhILAoGAJaHuwUgxzctayQ3rEkKx\njV03i4DfNFCLgktkbKUD7Ka8gYC1m5xgo6vd4ZXt7KGoyv9LRgNChVJsw4IchILM\n8cmY01/Z/UHNltj4Nsl5eNUAkS7qn/4aB43rZeIfAIci++c0P2kfMkgErRxBdrg2\n104p0pBxT4pu2O5Cziq9k6Y=\n-----END PRIVATE KEY-----\n',
      client_email: 'firebase-adminsdk-3azyh@bluebiz-cafd5.iam.gserviceaccount.com',
      client_id: '115719781147548068876',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-3azyh%40bluebiz-cafd5.iam.gserviceaccount.com'
    }

  },
  fiatRateServiceOpts: {
    defaultProvider: 'BitPay',
    fetchInterval: 60 // in minutes
  },
  maintenanceOpts: {
    maintenanceMode: false
  },
  staticRoot: '/tmp/static'
  // simplex: {
  //   sandbox: {
  //     apiKey: 'simplex_sandbox_api_key_here',
  //     api: 'https://sandbox.test-simplexcc.com',
  //     appProviderId: 'simplex_provider_id_here'
  //   },
  //   production: {
  //     apiKey: 'simplex_production_api_key_here',
  //     api: 'https://backend-wallet-api.simplexcc.com',
  //     appProviderId: 'simplex_provider_id_here'
  //   }
  // },
  // To use email notifications uncomment this:
  // emailOpts: {
  //  host: 'localhost',
  //  port: 25,
  //  ignoreTLS: true,
  //  subjectPrefix: '[Wallet Service]',
  //  from: 'wallet-service@bitcore.io',
  //  templatePath: 'templates',
  //  defaultLanguage: 'en',
  //  defaultUnit: 'btc',
  //  publicTxUrlTemplate: {
  //    btc: {
  //      livenet: 'https://insight.bitcore.io/#/BTC/mainnet/tx/{{txid}}',
  //      testnet: 'https://insight.bitcore.io/#/BTC/testnet/tx/{{txid}}',
  //    },
  //    bch: {
  //      livenet: 'https://insight.bitcore.io/#/BCH/mainnet/tx/{{txid}}',
  //      testnet: 'https://insight.bitcore.io/#/BCH/testnet/tx/{{txid}}',
  //    }
  //  },
  // },
  // To use sendgrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //
  //
  // //then add:
  // mailer: sgMail,
};
