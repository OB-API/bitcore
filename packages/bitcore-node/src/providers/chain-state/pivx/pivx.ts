import { InternalStateProvider } from "../internal/internal";

export class PIVXStateProvider extends InternalStateProvider{
  constructor(chain: string = 'PIVX') {
    super(chain);
  }
}
