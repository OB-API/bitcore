import { InternalStateProvider } from "../internal/internal";

export class RPDStateProvider extends InternalStateProvider{
  constructor(chain: string = 'RPD') {
    super(chain);
  }
}
