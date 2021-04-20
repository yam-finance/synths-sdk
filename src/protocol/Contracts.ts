import EMPContract from "../abi/emp.json";
import EMPContractOld from "../abi/empold.json";
import VaultContract from "../abi/vault.json";

export class Contracts {

  options;
  web3;
  emp;
  empV1;
  vault;
  constructor(options: any, config?: any) {
    this.options = options;
    this.web3 = options.web3;
    this.emp = new this.web3.eth.Contract(EMPContract.abi);
    this.empV1 = new this.web3.eth.Contract(EMPContractOld.abi);
    this.vault = new this.web3.eth.Contract(VaultContract.abi);
  }
}
