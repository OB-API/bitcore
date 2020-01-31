import { BitcoinP2PWorker } from '../bitcoin/p2p';
import { BaseModule } from '..';
import { RPDStateProvider } from '../../providers/chain-state/rpd/rpd';
import { VerificationPeer } from '../bitcoin/VerificationPeer';

export default class RapidsModule extends BaseModule {
  constructor(services) {
    super(services);
    services.Libs.register('RPD', '@bitrupee/rapids-lib', '@bitrupee/rapids-p2p');
    services.P2P.register('RPD', BitcoinP2PWorker);
    services.CSP.registerService('RPD', new RPDStateProvider());
    services.Verification.register('RDP', VerificationPeer);
  }
}
