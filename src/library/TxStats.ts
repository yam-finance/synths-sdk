/**
 * @notice The following is a sdk implementation of the tx stats calculation.
 * This code is not used in any test. To enable a test call, uncomment the
 * necessary lines in src/index.ts and add a test case.
 */

import { getTxStats } from "../utils/stats";

export class TxStats {

  private options;
  constructor(options: any) {
    this.options = options;
  }

  /**
  * Fetch user transactions statistics
  * @param {number} startTimestamp Start timestamp of the input
  * @param {number} endTimestamp End timestamp of the input
  * @public
  * @methods
  */
  getUserStats = async (startTimestamp: number, endTimestamp: number) => {

    const [txGasCostETH, averageTxPrice, txCount, failedTxCount, failedTxGasCostETH] = await getTxStats(
      this.options.provider,
      this.options.account,
      startTimestamp,
      endTimestamp,
    );

    return [txGasCostETH, averageTxPrice, txCount, failedTxCount, failedTxGasCostETH];
  };

}
