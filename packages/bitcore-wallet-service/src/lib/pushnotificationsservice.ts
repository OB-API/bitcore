import * as async from 'async';
import * as fs from 'fs';
import _ from 'lodash';
import 'source-map-support/register';

const {google} = require('googleapis');
import request from 'request';
import logger from '../../../bitcore-node/src/logger';
import { MessageBroker } from './messagebroker';
import { INotification, IPreferences } from './model';
import { Storage } from './storage';

const Mustache = require('mustache');
const defaultRequest = require('request');
const path = require('path');
const Utils = require('./common/utils');
const Defaults = require('./common/defaults');
const Constants = require('./common/constants');
const sjcl = require('sjcl');
const log = require('npmlog');
log.debug = log.verbose;

const PUSHNOTIFICATIONS_TYPES = {
  NewCopayer: {
    filename: 'new_copayer'
  },
  WalletComplete: {
    filename: 'wallet_complete',
    notifyCreatorOnly: true
  },
  NewTxProposal: {
    filename: 'new_tx_proposal'
  },
  NewOutgoingTx: {
    filename: 'new_outgoing_tx'
  },
  NewIncomingTx: {
    filename: 'new_incoming_tx'
  },
  TxProposalFinallyRejected: {
    filename: 'txp_finally_rejected'
  },
  TxConfirmation: {
    filename: 'tx_confirmation',
    notifyCreatorOnly: true
  }
};

export interface IPushNotificationService {
  templatePath: string;
  defaultLanguage: string;
  defaultUnit: string;
  subjectPrefix: string;
  pushServerUrl: any ;
  availableLanguages: string;
  authorizationKey: any;
  messageBroker: any;
  scopes:[];

}

export class PushNotificationsService {
  request: request.RequestAPI<any, any, any>;
  templatePath: string;
  defaultLanguage: string;
  defaultUnit: string;
  subjectPrefix: string;
  pushServerUrl: any;
  availableLanguages: string;
  authorizationKey: any;
  storage: Storage;
  messageBroker: any;
  scopes: any;


  start(opts, cb) {
    opts = opts || {};
    this.request = defaultRequest;

    const _readDirectories = (basePath, cb) => {
      fs.readdir(basePath, (err, files) => {
        if (err) return cb(err);
        async.filter(
          files,
          (file, next: (err: boolean) => void) => {
            fs.stat(path.join(basePath, file), (err, stats) => {
              return next(!err && stats.isDirectory());
            });
          },
          dirs => {
            return cb(null, dirs);
          }
        );
      });
    };

    this.templatePath = path.normalize(
      (opts.pushNotificationsOpts.templatePath || __dirname + '../../templates') + '/'
    );
    this.defaultLanguage = opts.pushNotificationsOpts.defaultLanguage || 'en';
    this.defaultUnit = opts.pushNotificationsOpts.defaultUnit || 'btc';
    this.subjectPrefix = opts.pushNotificationsOpts.subjectPrefix || '';
    this.pushServerUrl = opts.pushNotificationsOpts.pushServerUrl;
    this.authorizationKey = opts.pushNotificationsOpts.authorizationKey;
    this.scopes = opts.pushNotificationsOpts.scopes;

    if (!this.authorizationKey) return cb(new Error('Missing authorizationKey attribute in configuration.'));

    async.parallel(
      [
        done => {
          _readDirectories(this.templatePath, (err, res) => {
            this.availableLanguages = res;
            done(err);
          });
        },
        done => {
          if (opts.storage) {
            this.storage = opts.storage;
            done();
          } else {
            this.storage = new Storage();
            this.storage.connect(opts.storageOpts, done);
          }
        },
        done => {
          this.messageBroker = opts.messageBroker || new MessageBroker(opts.messageBrokerOpts);
          this.messageBroker.onMessage(_.bind(this._sendPushNotifications, this));
          done();
        }
      ],
      err => {
        if (err) {
          log.error(err);
        }
        return cb(err);
      }
    );
  }

  _sendPushNotifications(notification, cb) {
    cb = cb || function() {};

    const notifType = PUSHNOTIFICATIONS_TYPES[notification.type];
    if (!notifType) return cb();

    log.debug('Notification received: ' + notification.type);
    log.debug(JSON.stringify(notification));

    this._checkShouldSendNotif(notification, (err, should) => {
      if (err) return cb(err);

      log.debug('Should send notification: ', should);
      if (!should) return cb();

      this._getRecipientsList(notification, notifType, (err, recipientsList) => {
        if (err) return cb(err);
        log.debug('Did get the recipient: ',true);
        async.waterfall(
          [
            next => {
              this._readAndApplyTemplates(notification, notifType, recipientsList, next);
            },
            (contents, next) => {
              async.map(
                recipientsList,
                (recipient: IPreferences, next) => {
                  const content = contents[recipient.language];

                  this.storage.fetchPushNotificationSubs(recipient.copayerId, (err, subs) => {
                    if (err) return next(err);

                    const notifications = _.map(subs, sub => {
                      const tokenAddress =
                        notification.data && notification.data.tokenAddress ? notification.data.tokenAddress : null;
                      return {
                        message: {
                          android: {
                            priority: 'high',
                            restricted_package_name: sub.packageName,
                            notification: {
                              title: content.plain.subject,
                              body: content.plain.body,
                              icon: 'fcm_push_icon',
                              default_sound: true,
                              click_action: 'FCM_PLUGIN_ACTIVITY',
                            }
                          },
                          topic: sub.token,
                          notification: {
                            title: content.plain.subject,
                            body: content.plain.body,

                          },
                          data: {
                            walletId: sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(notification.walletId)),
                            tokenAddress,
                            copayerId: sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(recipient.copayerId)),
                            title: content.plain.subject,
                            body: content.plain.body,
                            notification_type: notification.type
                          }
                        }
                      };
                    });
                    return next(err, notifications);
                  });
                },
                (err, allNotifications) => {
                  if (err) return next(err);
                  return next(null, _.flatten(allNotifications));
                }
              );
            },
            (notifications, next) => {
              async.each(
                notifications,
                (notification, next) => {
                  this._makeRequest(notification, (err, response) => {
                    if (err) log.error(err);
                    if (response) {
                      log.debug('Request status: ', response.statusCode);
                      log.debug('Request message: ', response.statusMessage);
                      log.debug('Request body: ', response.request.body);
                    }
                    next();
                  });
                },
                err => {
                  return next(err);
                }
              );
            }
          ],
          err => {
            if (err) {
              log.error('An error ocurred generating notification', err);
            }
            return cb(err);
          }
        );
      });
    });
  }

  _checkShouldSendNotif(notification, cb) {
    if (notification.type != 'NewTxProposal') return cb(null, true);
    this.storage.fetchWallet(notification.walletId, (err, wallet) => {
      return cb(err, wallet && wallet.m > 1);
    });
  }

  _getRecipientsList(notification, notificationType, cb) {
    this.storage.fetchWallet(notification.walletId, (err, wallet) => {
      if (err) return cb(err);

      let unit;
      if (wallet.coin != Defaults.COIN) {
        unit = wallet.coin;
      }

      this.storage.fetchPreferences(notification.walletId, null, (err, preferences) => {
        if (err) log.error(err);
        if (_.isEmpty(preferences)) preferences = [];

        const recipientPreferences = _.compact(
          _.map(preferences, p => {
            if (!_.includes(this.availableLanguages, p.language)) {
              if (p.language) log.warn('Language for notifications "' + p.language + '" not available.');
              p.language = this.defaultLanguage;
            }

            return {
              copayerId: p.copayerId,
              language: p.language,
              unit: unit || p.unit || this.defaultUnit
            };
          })
        );

        const copayers = _.keyBy(recipientPreferences, 'copayerId');

        const recipientsList = _.compact(
          _.map(wallet.copayers, copayer => {
            if (
              (copayer.id == notification.creatorId && notificationType.notifyCreatorOnly) ||
              (copayer.id != notification.creatorId && !notificationType.notifyCreatorOnly)
            ) {
              const p = copayers[copayer.id] || {
                language: this.defaultLanguage,
                unit: this.defaultUnit
              };
              return {
                copayerId: copayer.id,
                language: p.language || this.defaultLanguage,
                unit: unit || p.unit || this.defaultUnit
              };
            }
          })
        );

        return cb(null, recipientsList);
      });
    });
  }

  _readAndApplyTemplates(notification, notifType, recipientsList, cb) {
    async.map(
      recipientsList,
      (recipient: { language: string }, next) => {
        async.waterfall(
          [
            next => {
              this._getDataForTemplate(notification, recipient, next);
            },
            (data, next) => {
              async.map(
                ['plain', 'html'],
                (type, next) => {
                  this._loadTemplate(notifType, recipient, '.' + type, (err, template) => {
                    if (err && type == 'html') return next();
                    if (err) return next(err);

                    this._applyTemplate(template, data, (err, res) => {
                      return next(err, [type, res]);
                    });
                  });
                },
                (err, res) => {
                  return next(err, _.fromPairs(res.filter(Boolean) as any[]));
                }
              );
            },
            (result, next) => {
              next(null, result);
            }
          ],
          (err, res) => {
            next(err, [recipient.language, res]);
          }
        );
      },
      (err, res) => {
        return cb(err, _.fromPairs(res.filter(Boolean) as any[]));
      }
    );
  }

  _getDataForTemplate(notification: INotification, recipient, cb) {
    const UNIT_LABELS = {
      btc: 'BTC',
      bit: 'bits',
      bch: 'BCH',
      eth: 'ETH',
      xrp: 'XRP',
      usdc: 'USDC',
      pax: 'PAX',
      gusd: 'GUSD',
      busd: 'BUSD'
    };
    const data = _.cloneDeep(notification.data);
    data.subjectPrefix = _.trim(this.subjectPrefix + ' ');
    if (data.amount) {
      try {
        let unit = recipient.unit.toLowerCase();
        let label = UNIT_LABELS[unit];
        if (data.tokenAddress) {
          const tokenAddress = data.tokenAddress.toLowerCase();
          if (Constants.TOKEN_OPTS[tokenAddress]) {
            unit = Constants.TOKEN_OPTS[tokenAddress].symbol.toLowerCase();
            label = UNIT_LABELS[unit];
          } else {
            label = 'tokens';
            throw new Error('Notifications for unsupported token are not allowed');
          }
        }
        data.amount = Utils.formatAmount(+data.amount, unit) + ' ' + label;
      } catch (ex) {
        return cb(new Error('Could not format amount' + ex));
      }
    }

    this.storage.fetchWallet(notification.walletId, (err, wallet) => {
      if (err || !wallet) return cb(err);

      data.walletId = wallet.id;
      data.walletName = wallet.name;
      data.walletM = wallet.m;
      data.walletN = wallet.n;

      const copayer = wallet.copayers.find(c => c.id === notification.creatorId);
      /*
       *var copayer = _.find(wallet.copayers, {
       *  id: notification.creatorId
       *});
       */

      if (copayer) {
        data.copayerId = copayer.id;
        data.copayerName = copayer.name;
      }

      if (notification.type == 'TxProposalFinallyRejected' && data.rejectedBy) {
        const rejectors = _.map(data.rejectedBy, copayerId => {
          return wallet.copayers.find(c => c.id === copayerId).name;
        });
        data.rejectorsNames = rejectors.join(', ');
      }

      return cb(null, data);
    });
  }

  _applyTemplate(template, data, cb) {
    if (!data) return cb(new Error('Could not apply template to empty data'));

    let error;
    const result = _.mapValues(template, t => {
      try {
        return Mustache.render(t, data);
      } catch (e) {
        log.error('Could not apply data to template', e);
        error = e;
      }
    });

    if (error) return cb(error);
    return cb(null, result);
  }

  _loadTemplate(notifType, recipient, extension, cb) {
    this._readTemplateFile(recipient.language, notifType.filename + extension, (err, template) => {
      if (err) return cb(err);
      return cb(null, this._compileTemplate(template, extension));
    });
  }

  _readTemplateFile(language, filename, cb) {
    const fullFilename = path.join(this.templatePath, language, filename);
    fs.readFile(fullFilename, 'utf8', (err, template) => {
      if (err) {
        return cb(new Error('Could not read template file ' + fullFilename + err));
      }
      return cb(null, template);
    });
  }

  _compileTemplate(template, extension) {
    const lines = template.split('\n');
    if (extension == '.html') {
      lines.unshift('');
    }
    return {
      subject: lines[0],
      body: _.tail(lines).join('\n')
    };
  }

  _makeRequest(opts, cb) {
    const url = 'https://' + this.pushServerUrl.url +  this.pushServerUrl.projectId + this.pushServerUrl.path;
    this._getAccessToken().then((accessToken) => {
      this.request(
        {
          url,
          method: 'POST',
          json: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + accessToken
          },
          body: opts
        },
        cb
      );
    });
  }

  _getAccessToken(){
    return new Promise(function(resolve, reject) {
      const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];
      const key = {
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
      };
      var jwtClient = new google.auth.JWT(
        key.client_email,
        null,
        key.private_key,
        SCOPES,
        null
      );
      jwtClient.authorize(function(err, tokens) {
        if (err) {
          reject(err);
          return;
        }
        resolve(tokens.access_token);
      });
    });
  }


}
