module.exports = {
  BTC: {
    lib: require('bitcore-lib'),
    p2p: require('bitcore-p2p'),
  },
  BCH: {
    lib: require('bitcore-lib-cash'),
    p2p: require('bitcore-p2p-cash'),
  },
  RPD: {
    lib: require('@bitrupee/rapids-lib'),
    p2p: require('@bitrupee/rapids-p2p'),
  }
};
