import { exchangeABI } from 'transactions/erc20/uniswap';
import Web3 from 'web3';
import { ETHTxProvider } from '../eth';

export class ExchangeTxProvider extends ETHTxProvider {
  getUniSwapExchange(tokenContractAddress) {
    const web3 = new Web3();
    const contract = new web3.eth.Contract(exchangeABI, tokenContractAddress);
    return contract;
  }

  getExchange() {
    return '0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667';
  }

  getDeadline() {
    return Date.now() + 300;
  }

  swapETHToDai(amount) {
    const deadline = this.getDeadline();
    const data = this.getUniSwapExchange(this.getExchange())
      .methods.ethToTokenSwapOutput(amount, deadline)
      .encodeABI();
    return data;
  }

  swapBackToETH(amount) {
    const deadline = this.getDeadline();
    const data = this.getUniSwapExchange(this.getExchange())
      .methods.tokenToEthSwapOutput(amount, deadline)
      .encodeABI();
    return data;
  }
}
