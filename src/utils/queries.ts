import { gql } from "graphql-request";

export const UNISWAP_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2";
export const SUSHISWAP_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/sushiswap/exchange";
export const BLOCKLYTICS_ENDPOINT = "https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks";

export const TIMESTAMP_TO_BLOCK = gql`
query blocks($timestamp: Int!) {
    blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_lte: $timestamp }) {
        number
    }
  }
`;

export const UNI_SUSHI_PAIR_DATA = gql`
  query pair($pairAddress: Bytes!, $blockNumber: Int!) {
    pair(id: $pairAddress, block: { number: $blockNumber }) {
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
      reserve0
      reserve1
      volumeUSD
      volumeToken0
      volumeToken1
      reserveUSD
    }
  }
`;

export const UNI_SUSHI_DAILY_PAIR_DATA = gql`
  query pairDayDatas($pairAddress: Bytes!, $startingTime: Int!, $endingTime: Int!) {
    pairDayDatas(orderDirection: desc, where: { pair: $pairAddress, date_gte: $startingTime, date_lte: $endingTime }) {
      token0 {
        symbol
      }
      token1 {
        symbol
      }      
      date
      reserve0
      reserve1
      volumeUSD
      reserveUSD
    }
  }
`;
