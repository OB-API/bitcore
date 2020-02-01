'use strict';

var spec = {
  name: 'P2P',
  message: 'Internal Error on pivx-p2p Module {0}'
};

module.exports = require('rapids-lib').errors.extend(spec);
