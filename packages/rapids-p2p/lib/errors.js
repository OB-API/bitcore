'use strict';

var spec = {
  name: 'P2P',
  message: 'Internal Error on rapids-p2p Module {0}'
};

module.exports = require('rapids-lib').errors.extend(spec);
