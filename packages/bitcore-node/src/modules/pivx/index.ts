import { BitcoinP2PWorker } from '../bitcoin/p2p';
import { BaseModule } from '..';
import { PIVXStateProvider } from '../../providers/chain-state/pivx/pivx';
import { VerificationPeer } from '../bitcoin/VerificationPeer';

export default class RapidsModule extends BaseModule {
  constructor(services) {
    super(services);
    services.Libs.register('PIVX', '@bitrupee/rapids-lib', '@bitrupee/rapids-p2p');
    services.P2P.register('PIVX', BitcoinP2PWorker);
    services.CSP.registerService('RPD', new PIVXStateProvider());
    services.Verification.register('RDP', VerificationPeer);
  }
}
