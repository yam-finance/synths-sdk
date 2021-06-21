import { gql } from 'graphql-request';

export const UNISWAP_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
export const SUSHISWAP_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange';

export const UNISWAP_MARKET_DATA_QUERY = gql`
  query pair($poolAddress: Bytes!) {
    pair(id: $poolAddress) {
      reserveUSD
      token0 {
        symbol
      }
      token0Price
      token1 {
        symbol
      }
      token1Price
    }
  }
`;

export const UNISWAP_DAILY_PRICE_QUERY = gql`
  query tokenDayDatas($tokenAddresses: [String!], $startingTime: Int!) {
    tokenDayDatas(orderBy: date, orderDirection: asc, where: { token_in: $tokenAddresses, date_gt: $startingTime }) {
      id
      date
      priceUSD
    }
  }
`;

// TODO
export const UNISWAP_DAILY_PRICE_QUERY2 = gql`
  query tokenDayDatas($tokenAddresses: [String!], $startingTime: Int!) {
    tokenDayDatas(orderBy: date, orderDirection: asc, where: { token_in: $tokenAddresses, date_gt: $startingTime }) {
      date
      price
      priceUSD
    }
  }
`;

export const UNISWAP_DAILY_PAIR_DATA = gql`
  query pairDayDatas($pairAddress: Bytes!, $startingTime: Int!) {
    pairDayDatas(orderBy: date, orderDirection: asc, where: { pairAddress: $pairAddress, date_gt: $startingTime }) {
      date
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

export const UNISWAP_PRICE_PER_ETH = gql`
  query token($tokenAddress: ID!) {
    token(id: $tokenAddress) {
      derivedETH
    }
  }
`;
