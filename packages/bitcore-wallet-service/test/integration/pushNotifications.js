'use strict';

var _ = require('lodash');
var async = require('async');

var chai = require('chai');
var sinon = require('sinon');
var should = chai.should();
var log = require('npmlog');
log.debug = log.verbose;
log.level = 'info';
const request = require('request');

var sjcl = require('sjcl');

var { WalletService } = require('../../ts_build/bitcore-wallet-service/src/lib/server');
var { PushNotificationsService } = require('../../ts_build/bitcore-wallet-service/src/lib/pushnotificationsservice');

var TestData = require('../testdata');
var helpers = require('./helpers');
const TOKENS = ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x8E870D67F660D95d5be530380D0eC0bd388289E1', '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd'];


describe('Push notifications', function() {
  var server, wallet, requestStub, pushNotificationsService, walletId;


  before(function(done) {
    helpers.before((res) => {
      done();
    });
  });


  after(function(done) {
    helpers.after(done);
  });

  describe('Single wallet', function() {
    beforeEach(function(done) {
      helpers.beforeEach(function(res) {
        helpers.createAndJoinWallet(1, 1, function(s, w) {
          server = s;
          wallet = w;

          var i = 0;
          async.eachSeries(w.copayers, function(copayer, next) {
            helpers.getAuthServer(copayer.id, function(server) {
              async.parallel([

                function(done) {
                  server.savePreferences({
                    email: 'copayer' + (++i) + '@domain.com',
                    language: 'en',
                    unit: 'bit',
                  }, done);
                },
                function(done) {
                  server.pushNotificationsSubscribe({
                    token: '1234',
                    packageName: 'com.wallet',
                    platform: 'Android',
                  }, done);
                },
              ], next);

            });
          }, function(err) {
            should.not.exist(err);

            requestStub = sinon.stub();
            requestStub.yields();

            pushNotificationsService = new PushNotificationsService();
            pushNotificationsService.start({
              lockOpts: {},
              messageBroker: server.messageBroker,
              storage: helpers.getStorage(),
              request:requestStub,
              pushNotificationsOpts: {
                templatePath: 'templates',
                defaultLanguage: 'en',
                defaultUnit: 'btc',
                subjectPrefix: '',
                pushServerUrl: 'http://localhost:8000',
                authorizationKey: 'secret',
              },
            }, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });

    it('should build each notifications using preferences of the copayers', function(done) {
      server.savePreferences({
        language: 'en',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, function(err, address) {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '999',
            address: address,
            amount: 12300000,
          }, {
            isGlobal: true
          }, function(err) {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              var args = _.map(calls, function(c) {
                return c.args[0];
              });
              calls.length.should.equal(1);
              args[0].body.notification.title.should.contain('New payment received');
              args[0].body.notification.body.should.contain('123,000');
              args[0].body.notification.body.should.contain('bits');
              done();
            }, 100);
          });
        });
      });
    });

    it('should not notify auto-payments to creator', function(done) {
      server.createAddress({}, function(err, address) {
        should.not.exist(err);

        // Simulate incoming tx notification
        server._notify('NewIncomingTx', {
          txid: '999',
          address: address,
          amount: 12300000,
        }, {
          isGlobal: false
        }, function(err) {
          setTimeout(function() {
            var calls = requestStub.getCalls();
            calls.length.should.equal(0);
            done();
          }, 100);
        });
      });
    });

    it('should notify copayers when payment is received', function(done) {
      server.createAddress({}, function(err, address) {
        should.not.exist(err);

        // Simulate incoming tx notification
        server._notify('NewIncomingTx', {
          txid: '999',
          address: address,
          amount: 12300000,
        }, {
          isGlobal: true
        }, function(err) {
          setTimeout(function() {
            var calls = requestStub.getCalls();
            calls.length.should.equal(1);
            done();
          }, 100);
        });
      });
    });

    it('should notify copayers when tx is confirmed if they are subscribed', function(done) {
      server.createAddress({}, function(err, address) {
        should.not.exist(err);

        server.txConfirmationSubscribe({
          txid: '123'
        }, function(err) {
          should.not.exist(err);

          // Simulate tx confirmation notification
          server._notify('TxConfirmation', {
            txid: '123',
          }, function(err) {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              calls.length.should.equal(1);
              done();
            }, 100);
          });
        });
      });
    });
  });

  describe('Shared wallet', function() {
    beforeEach(function(done) {
      helpers.beforeEach(function(res) {
        helpers.createAndJoinWallet(2, 3, function(s, w) {
          server = s;
          wallet = w;
          var i = 0;
          async.eachSeries(w.copayers, function(copayer, next) {
            helpers.getAuthServer(copayer.id, function(server) {
              async.parallel([

                function(done) {
                  server.savePreferences({
                    email: 'copayer' + (++i) + '@domain.com',
                    language: 'en',
                    unit: 'bit',
                  }, done);
                },
                function(done) {
                  server.pushNotificationsSubscribe({
                    token: '1234',
                    packageName: 'com.wallet',
                    platform: 'Android',
                  }, done);
                },
              ], next);

            });
          }, function(err) {
            should.not.exist(err);

            requestStub = sinon.stub();
            requestStub.yields();

            pushNotificationsService = new PushNotificationsService();
            pushNotificationsService.start({
              lockOpts: {},
              messageBroker: server.messageBroker,
              storage: helpers.getStorage(),
              request: requestStub,
              pushNotificationsOpts: {
                templatePath: 'templates',
                defaultLanguage: 'en',
                defaultUnit: 'btc',
                subjectPrefix: '',
                pushServerUrl: 'http://localhost:8000',
                authorizationKey: 'secret',
              },
            }, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });

    it('should build each notifications using preferences of the copayers', function(done) {
      server.savePreferences({
        email: 'copayer1@domain.com',
        language: 'es',
        unit: 'btc',
      }, function(err) {
        server.createAddress({}, function(err, address) {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '999',
            address: address,
            amount: 12300000,
          }, {
            isGlobal: true
          }, function(err) {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              var args = _.map(calls, function(c) {
                return c.args[0];
              });

              calls.length.should.equal(3);

              args[0].body.notification.title.should.contain('Nuevo pago recibido');
              args[0].body.notification.body.should.contain('0.123');

              args[1].body.notification.title.should.contain('New payment received');
              args[1].body.notification.body.should.contain('123,000');

              args[2].body.notification.title.should.contain('New payment received');
              args[2].body.notification.body.should.contain('123,000');
              done();
            }, 100);
          });
        });
      });
    });

    it('should notify copayers when payment is received', function(done) {
      server.createAddress({}, function(err, address) {
        should.not.exist(err);

        // Simulate incoming tx notification
        server._notify('NewIncomingTx', {
          txid: '999',
          address: address,
          amount: 12300000,
        }, {
          isGlobal: true
        }, function(err) {
          setTimeout(function() {
            var calls = requestStub.getCalls();
            calls.length.should.equal(3);

            done();
          }, 100);
        });
      });
    });

    it('should not notify auto-payments to creator', function(done) {
      server.createAddress({}, function(err, address) {
        should.not.exist(err);

        // Simulate incoming tx notification
        server._notify('NewIncomingTx', {
          txid: '999',
          address: address,
          amount: 12300000,
        }, {
          isGlobal: false
        }, function(err) {
          setTimeout(function() {
            var calls = requestStub.getCalls();
            calls.length.should.equal(2);

            done();
          }, 100);
        });
      });
    });

    it('should notify copayers a new tx proposal has been created', function(done) {
      helpers.stubUtxos(server, wallet, [1, 1], function() {
        server.createAddress({}, function(err, address) {
          should.not.exist(err);
          server._notify('NewTxProposal', {
            txid: '999',
            address: address,
            amount: 12300000,
          }, {
            isGlobal: false
          }, function(err) {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              calls.length.should.equal(2);

              done();
            }, 100);
          });
        });
      });
    });

    it('should notify copayers a tx has been finally rejected', function(done) {
      helpers.stubUtxos(server, wallet, 1, function() {
        var txOpts = {
          outputs: [{
            toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
            amount: 0.8e8
          }],
          feePerKb: 100e2
        };

        var txpId;
        async.waterfall([

          function(next) {
            helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function(tx) {
              next(null, tx);
            });
          },
          function(txp, next) {
            txpId = txp.id;
            async.eachSeries(_.range(1, 3), function(i, next) {
              var copayer = TestData.copayers[i];
              helpers.getAuthServer(copayer.id44btc, function(server) {
                server.rejectTx({
                  txProposalId: txp.id,
                }, next);
              });
            }, next);
          },
        ], function(err) {
          should.not.exist(err);

          setTimeout(function() {
            var calls = requestStub.getCalls();
            var args = _.map(_.takeRight(calls, 2), function(c) {
              return c.args[0];
            });

            args[0].body.notification.title.should.contain('Payment proposal rejected');
            done();
          }, 100);
        });
      });
    });

    it('should notify copayers a new outgoing tx has been created', function(done) {
      helpers.stubUtxos(server, wallet, 1, function() {
        var txOpts = {
          outputs: [{
            toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
            amount: 0.8e8
          }],
          feePerKb: 100e2
        };

        var txp;
        async.waterfall([

          function(next) {
            helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function(tx) {
              next(null, tx);
            });
          },
          function(t, next) {
            txp = t;
            async.eachSeries(_.range(1, 3), function(i, next) {
              var copayer = TestData.copayers[i];
              helpers.getAuthServer(copayer.id44btc, function(s) {
                server = s;
                var signatures = helpers.clientSign(txp, copayer.xPrivKey_44H_0H_0H);
                server.signTx({
                  txProposalId: txp.id,
                  signatures: signatures,
                }, function(err, t) {
                  txp = t;
                  next();
                });
              });
            }, next);
          },
          function(next) {
            helpers.stubBroadcast(txp.txid);
            server.broadcastTx({
              txProposalId: txp.id,
            }, next);
          },
        ], function(err) {
          should.not.exist(err);

          setTimeout(function() {
            var calls = requestStub.getCalls();
            var args = _.map(_.takeRight(calls, 2), function(c) {
              return c.args[0];
            });

            args[0].body.notification.title.should.contain('Payment sent');
            args[1].body.notification.title.should.contain('Payment sent');

            sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(server.copayerId)).should.not.equal(args[0].body.data.copayerId);
            sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(server.copayerId)).should.not.equal(args[1].body.data.copayerId);
            done();
          }, 100);
        });
      });
    });
  });

  describe('joinWallet', function() {
    beforeEach(function(done) {
      helpers.beforeEach(function(res) {
        server = new WalletService();
        var walletOpts = {
          name: 'my wallet',
          m: 1,
          n: 3,
          pubKey: TestData.keyPair.pub,
        };
        server.createWallet(walletOpts, function(err, wId) {
          should.not.exist(err);
          walletId = wId;
          should.exist(walletId);
          requestStub = sinon.stub();
          requestStub.yields();

          pushNotificationsService = new PushNotificationsService();
          pushNotificationsService.start({
            lockOpts: {},
            messageBroker: server.messageBroker,
            storage: helpers.getStorage(),
            request: requestStub,
            pushNotificationsOpts: {
              templatePath: 'templates',
              defaultLanguage: 'en',
              defaultUnit: 'btc',
              subjectPrefix: '',
              pushServerUrl: 'http://localhost:8000',
              authorizationKey: 'secret',
            },
          }, function(err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });

    it('should notify copayers when a new copayer just joined into your wallet except the one who joined', function(done) {
      async.eachSeries(_.range(3), function(i, next) {
        var copayerOpts = helpers.getSignedCopayerOpts({
          walletId: walletId,
          name: 'copayer ' + (i + 1),
          xPubKey: TestData.copayers[i].xPubKey_44H_0H_0H,
          requestPubKey: TestData.copayers[i].pubKey_1H_0,
          customData: 'custom data ' + (i + 1),
        });

        server.joinWallet(copayerOpts, function(err, res) {
          if (err) return next(err);

          helpers.getAuthServer(res.copayerId, function(server) {
            server.pushNotificationsSubscribe({
              token: 'token:' + copayerOpts.name,
              packageName: 'com.wallet',
              platform: 'Android',
            }, next);
          });
        });
      }, function(err) {
        should.not.exist(err);
        setTimeout(function() {
          var calls = requestStub.getCalls();
          var args = _.filter(_.map(calls, function(call) {
            return call.args[0];
          }), function(arg) {
            return arg.body.notification.title == 'New copayer';
          });

          server.getWallet(null, function(err, wallet) {
            /*
              First call - copayer2 joined
              copayer2 should notify to copayer1
              copayer2 should NOT be notifyed
            */
            var hashedCopayerIds = _.map(wallet.copayers, function(copayer) {
              return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(copayer.id));
            });
            hashedCopayerIds[0].should.equal((args[0].body.data.copayerId));
            hashedCopayerIds[1].should.not.equal((args[0].body.data.copayerId));

            /*
              Second call - copayer3 joined
              copayer3 should notify to copayer1
            */
            hashedCopayerIds[0].should.equal((args[1].body.data.copayerId));

            /*
              Third call - copayer3 joined
              copayer3 should notify to copayer2
            */
            hashedCopayerIds[1].should.equal((args[2].body.data.copayerId));

            // copayer3 should NOT notify any other copayer
            hashedCopayerIds[2].should.not.equal((args[1].body.data.copayerId));
            hashedCopayerIds[2].should.not.equal((args[2].body.data.copayerId));
            done();
          });
        }, 100);
      });
    });
  });

  describe('ERC20 wallet', () => {
    beforeEach((done) => {

      helpers.beforeEach((res) => {
        helpers.createAndJoinWallet(1, 1, { coin: 'eth' }, (s, w) => {
          server = s;
          wallet = w;

          var i = 0;
          async.eachSeries(w.copayers, function(copayer, next) {
            helpers.getAuthServer(copayer.id, function(server) {
              async.parallel([

                function(done) {
                  server.savePreferences({
                    email: 'copayer' + (++i) + '@domain.com',
                    language: 'en',
                    unit: 'bit',
                    tokenAddresses: TOKENS,
                  }, done);
                },
                function(done) {
                  server.pushNotificationsSubscribe({
                    token: '1234',
                    packageName: 'com.wallet.bluebiz',
                    platform: 'Android',
                  }, done);
                },
              ], next);

            });
          }, function(err) {
            should.not.exist(err);

            requestStub = sinon.stub();
            requestStub.yields();

            pushNotificationsService = new PushNotificationsService();
            pushNotificationsService.start({
              lockOpts: {},
              messageBroker: server.messageBroker,
              storage: helpers.getStorage(),
              request: requestStub,
              pushNotificationsOpts: {
                templatePath: 'templates',
                defaultLanguage: 'en',
                defaultUnit: 'btc',
                subjectPrefix: '',
                pushServerUrl: {
                  url: 'fcm.googleapis.com/v1/projects/',
                  projectId:'bluebiz-cafd5',
                  path: '/messages:send'
                },
                scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
                authorizationKey:  {
                  type: "service_account",
                  project_id: "bluebiz-cafd5",
                  private_key_id: "412937c4ed32508747d717314fa84478e5cbcdc6",
                  private_key: "-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCP+97rD0wZuM28\nEkfFxUq/437V30Ps6myOa1HshS67V7nqKZu4nMk3wx5ac+VMLuKLEDexL+P4FKHv\nVlKjnS4ivliHW/NPK6O6yyXOs8BwA2kAguI8KCXknh9+FZ+JbADBUo2dwRBYhq7uZsTFVj3kfoVUwMttyIMFv/jeli8G2XHozcOqWjj9q6mWCs85mEtwa8AbdVVrSFwG\nfv+MnOHF5OyiA6aLdmxzHVVJVUFVnkpo8sk9Yu7Fk99lp/dwVpstX5GTBAwtwS4R9TixMcxQ1i00SqL0JDvm6lDcRkzkG1UiU4a1Utt8AEJig6m5ERJYTKBmz/2yKQxJ\nR6ie/HulAgMBAAECggEAG7VY3NuAxaJu1TafYUvqaqsZCYeBxuIGKhI1HdMzfxIO\n0SVYtlpVzslZ2gZbpiGPrztbvFl/AYrW7vwpwxrIeh8vYj0rwZygUZ4ulGy7J9NALb0CVJlVUX2sidMXdJa4PnvojOdOgfrJR0+3plJGbuZ6Oikv/NyNelnLRuqX+jUs\naOtuiSs4t4Hs9OApRdC+6/mcd6omuMZskaaMc26evZgiNY/0W1+Ym0n8Rosm9sHUyfLbJiZbJnXb/xivOuELnO4PGsHEYE5C6lKl0QZUnu64Ffb2rIoKyTJUiWeqVTriOqW4UF2RqzGho130wYZWiIhXnDa1LtyeSd8Fs4wXMQKBgQDHLatDVGjE3z4XMbfz\n88CwbVJk32cL2qgrq/x9mkSCxfCkR8pE95ctTGDZZEC5ioFqHYKiKW4amVahoeYxVYpBqga0zGAGqHf0ltBvmXF/QvIbsOb+8aQg+fgWkKOsiBdbPO6p0bCiSp8I7UNV\nvpoVT0SQMhBjkznDdbuH530JqwKBgQC5D0Dg3IZSh+y1vCa5sz+t6lMTRaog6McNhTwm+IjhTziRzBfkEVDBFPvSrcy5xO0QHx07mWgDvCxNqLS8XtT8lrfbYQ0aLsMxBnA15bvNUBOBOGL6aKBFZ5r95MKfH5VnJm4jzyKMJ/nErtMz6vm1Clp4hvMMu5mFlsnsif5f7wKBgEWhapD0Llg87xjusa9gFInY/gfzrbOQMmBqFK/YQYEyL6lOy6CGqdwVKnp1OMdka0+sl2GXeD1mQ8nnrnCqxdWk2glUtXE+bgkcvCt3ih0CS19w3aBc25MHsDo7QGzterTTvV+yxbxGuAhH4dVU98rhVkfOqLoW2wfA3dlqDOVXAoGBAJB+Y3bvWQXp0Z5YyZfnaIo/0xvSIjNN7dYVuNDo79+UfqQASosuJfKMks9+GsLWCw+ya53Uew2niKQeXPhTx1NtzyLA1X0jFA8catL6jLeTlZco0seYl8N5UOB7FKcv/vSqYgcdvWjX8cJriscX6l88NUW0gOPpOsa+5O0HFhILAoGAJaHuwUgxzctayQ3rEkKxjV03i4DfNFCLgktkbKUD7Ka8gYC1m5xgo6vd4ZXt7KGoyv9LRgNChVJsw4IchILM8cmY01/Z/UHNltj4Nsl5eNUAkS7qn/4aB43rZeIfAIci++c0P2kfMkgErRxBdrg2104p0pBxT4pu2O5Cziq9k6Y=-----END PRIVATE KEY-----",
                  client_email: "firebase-adminsdk-3azyh@bluebiz-cafd5.iam.gserviceaccount.com",
                  client_id: "115719781147548068876",
                  auth_uri: "https://accounts.google.com/o/oauth2/auth",
                  token_uri: "https://oauth2.googleapis.com/token",
                  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-3azyh%40bluebiz-cafd5.iam.gserviceaccount.com"
                }
              },
            }, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });

    it('should send notification if the tx is USDC', (done) => {
      server.savePreferences({
        language: 'en',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, (err, address) => {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '997',
            address: address,
            amount: 4e6, // ~ 4.00 USD
            tokenAddress: TOKENS[0]
          }, {
            isGlobal: true
          }, (err) => {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              calls.length.should.equal(1);
              var args = _.map(_.takeRight(calls, 2), function(c) {
                return c.args[0];
              });
              args[0].body.notification.title.should.contain('New payment received');
              args[0].body.notification.title.should.contain('New payment received');
              args[0].body.notification.body.should.contain('4.00');
              args[0].body.data.tokenAddress.should.equal('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
              done();
            }, 100);
          });
        });
      });
    });
    it('should send notification with new provision of google services', (done) => {
      server.savePreferences({
        language: 'en',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, (err, address) => {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '997',
            address: address,
            amount: 4e6, // ~ 4.00 USD
            tokenAddress: TOKENS[0]
          }, {
            isGlobal: true
          }, (err) => {
            setTimeout(function() {
              done();
            }, 100);
          });
        });
      });
    });
    it('should send notification if the tx is PAX', (done) => {
      server.savePreferences({
        language: 'es',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, (err, address) => {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '998',
            address: address,
            amount: 4e18, // ~ 4.00 USD
            tokenAddress: TOKENS[1]
          }, {
            isGlobal: true
          }, (err) => {
            setTimeout(function() {
              console.log();
              done();
            }, 100);
          });
        });
      });
    });
    it('should send notification if the tx is GUSD', (done) => {
      server.savePreferences({
        language: 'en',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, (err, address) => {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '999',
            address: address,
            amount: 4e2, // ~ 4.00 USD
            tokenAddress: TOKENS[2]
          }, {
            isGlobal: true
          }, (err) => {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              calls.length.should.equal(1);
              var args = _.map(_.takeRight(calls, 2), function(c) {
                return c.args[0];
              });
              args[0].body.notification.title.should.contain('New payment received');
              args[0].body.notification.body.should.contain('4.00');
              args[0].body.data.tokenAddress.should.equal('0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd');
              done();
            }, 100);
          });
        });
      });
    });

    it('should not send notification if the tokenAddress is not supported', (done) => {
      server.savePreferences({
        language: 'en',
        unit: 'bit',
      }, function(err) {
        server.createAddress({}, (err, address) => {
          should.not.exist(err);

          // Simulate incoming tx notification
          server._notify('NewIncomingTx', {
            txid: '999',
            address: address,
            amount: 1230000000,
            tokenAddress: 'notSupportedTokenAddress'
          }, {
            isGlobal: true
          }, (err) => {
            setTimeout(function() {
              var calls = requestStub.getCalls();
              calls.length.should.equal(0);
              done();
            }, 100);
          });
        });
      });
    });
  });
});
