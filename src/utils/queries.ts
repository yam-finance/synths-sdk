import { gql } from "graphql-request";

export const UNISWAP_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2";
export const SUSHISWAP_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/sushiswap/exchange";

export const UNISWAP_PAIR_DATA = gql`
  query pair($pairAddress: Bytes!) {
    pair(id: $pairAddress) {
      token0 {
        id
      }
      token1 {
        id
      }
      reserve0
      reserve1
    }
  }
`;

export const SUSHISWAP_PAIR_DATA = gql`
  query pair($pairAddress: Bytes!) {
    pair(id: $pairAddress) {
      token0 {
        id
      }
      token1 {
        id
      }
      reserve0
      reserve1
    }
  }
`;
