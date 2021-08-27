/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { Greeter, GreeterInterface } from "../Greeter";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "_greeting",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "greet",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_greeting",
        type: "string",
      },
    ],
    name: "setGreeting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060405161085a38038061085a83398101604081905261002f9161017c565b61005b604051806060016040528060228152602001610838602291398261007560201b6101c41760201c565b805161006e9060009060208401906100e3565b50506102f9565b6100be828260405160240161008b92919061024a565b60408051601f198184030181529190526020810180516001600160e01b03908116634b5c427760e01b179091526100c216565b5050565b80516a636f6e736f6c652e6c6f67602083016000808483855afa5050505050565b8280546100ef906102a8565b90600052602060002090601f0160209004810192826101115760008555610157565b82601f1061012a57805160ff1916838001178555610157565b82800160010185558215610157579182015b8281111561015757825182559160200191906001019061013c565b50610163929150610167565b5090565b5b808211156101635760008155600101610168565b60006020828403121561018d578081fd5b81516001600160401b03808211156101a3578283fd5b818401915084601f8301126101b6578283fd5b8151818111156101c8576101c86102e3565b604051601f8201601f1916810160200183811182821017156101ec576101ec6102e3565b604052818152838201602001871015610203578485fd5b610214826020830160208701610278565b9695505050505050565b60008151808452610236816020860160208601610278565b601f01601f19169290920160200192915050565b60006040825261025d604083018561021e565b828103602084015261026f818561021e565b95945050505050565b60005b8381101561029357818101518382015260200161027b565b838111156102a2576000848401525b50505050565b6002810460018216806102bc57607f821691505b602082108114156102dd57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b610530806103086000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae321714610050575b600080fd5b61004e61004936600461030f565b61006e565b005b610058610132565b60405161006591906103fb565b60405180910390f35b61011b6040518060600160405280602381526020016104d8602391396000805461009790610486565b80601f01602080910402602001604051908101604052809291908181526020018280546100c390610486565b80156101105780601f106100e557610100808354040283529160200191610110565b820191906000526020600020905b8154815290600101906020018083116100f357829003601f168201915b505050505083610209565b805161012e906000906020840190610276565b5050565b60606000805461014190610486565b80601f016020809104026020016040519081016040528092919081815260200182805461016d90610486565b80156101ba5780601f1061018f576101008083540402835291602001916101ba565b820191906000526020600020905b81548152906001019060200180831161019d57829003601f168201915b5050505050905090565b61012e82826040516024016101da929190610415565b60408051601f198184030181529190526020810180516001600160e01b0316634b5c427760e01b179052610255565b61025083838360405160240161022193929190610443565b60408051601f198184030181529190526020810180516001600160e01b0316632ced7cef60e01b179052610255565b505050565b80516a636f6e736f6c652e6c6f67602083016000808483855afa5050505050565b82805461028290610486565b90600052602060002090601f0160209004810192826102a457600085556102ea565b82601f106102bd57805160ff19168380011785556102ea565b828001600101855582156102ea579182015b828111156102ea5782518255916020019190600101906102cf565b506102f69291506102fa565b5090565b5b808211156102f657600081556001016102fb565b60006020808385031215610321578182fd5b823567ffffffffffffffff80821115610338578384fd5b818501915085601f83011261034b578384fd5b81358181111561035d5761035d6104c1565b604051601f8201601f1916810185018381118282101715610380576103806104c1565b6040528181528382018501881015610396578586fd5b818585018683013790810190930193909352509392505050565b60008151808452815b818110156103d5576020818501810151868301820152016103b9565b818111156103e65782602083870101525b50601f01601f19169290920160200192915050565b60006020825261040e60208301846103b0565b9392505050565b60006040825261042860408301856103b0565b828103602084015261043a81856103b0565b95945050505050565b60006060825261045660608301866103b0565b828103602084015261046881866103b0565b9050828103604084015261047c81856103b0565b9695505050505050565b60028104600182168061049a57607f821691505b602082108114156104bb57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fdfe4368616e67696e67206772656574696e672066726f6d202725732720746f2027257327a2646970667358221220f2c3250414fd75097e4723e8dbce402a52ecdcc42d768efd5cad847e1970324a64736f6c634300080000334465706c6f79696e67206120477265657465722077697468206772656574696e673a";

export class Greeter__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _greeting: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<Greeter> {
    return super.deploy(_greeting, overrides || {}) as Promise<Greeter>;
  }
  getDeployTransaction(
    _greeting: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_greeting, overrides || {});
  }
  attach(address: string): Greeter {
    return super.attach(address) as Greeter;
  }
  connect(signer: Signer): Greeter__factory {
    return super.connect(signer) as Greeter__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): GreeterInterface {
    return new utils.Interface(_abi) as GreeterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Greeter {
    return new Contract(address, _abi, signerOrProvider) as Greeter;
  }
}
