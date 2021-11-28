export type Token = {
  /** display name of the token */
  name: string;
  /** secret contract address of the token */
  address: string;
  /** secret contract code hash of the token */
  code_hash: string;
  /** logo of the token */
  image: string;
  /** decimals of the token */
  decimals: number;
  /** how to deposit this token into Secret Network */
  deposit_from: Deposit[];
  /** how to withdraw this token out of Secret Network */
  withdraw_to: Withdraw[];
};

export type Deposit = {
  /** display name of the other chain */
  soure_chain_name: string;
  /** denom on the other chain */
  source_denom: string;
};

export type Withdraw = {
  /** display name of the other chain */
  destination_chain_name: string;
  /** denom on Secret Network */
  source_denom: string;
};

export const tokens: Token[] = [
  {
    name: "SCRT",
    address: "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek",
    code_hash:
      "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
    image: "/scrt.svg",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Cosmos Hub",
        source_denom: "TODO", // SCRT denom on Cosmos
      },
      {
        soure_chain_name: "Terra",
        source_denom: "TODO", // SCRT denom on Terra
      },
      {
        soure_chain_name: "Osmosis",
        source_denom: "TODO", // SCRT denom on Osmosis
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Cosmos Hub",
        source_denom: "uscrt",
      },
      {
        destination_chain_name: "Terra",
        source_denom: "uscrt",
      },
      {
        destination_chain_name: "Osmosis",
        source_denom: "uscrt",
      },
    ],
  },
  {
    name: "ATOM",
    address: "secret14mzwd0ps5q277l20ly2q3aetqe3ev4m4260gf4",
    code_hash:
      "ad91060456344fc8d8e93c0600a3957b8158605c044b3bef7048510b3157b807",
    image: "/atom.jpg",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Cosmos Hub",
        source_denom: "uatom",
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Cosmos Hub",
        source_denom:
          "ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2",
      },
    ],
  },
  {
    name: "Luna",
    address: "secret1ra7avvjh9fhr7dtr3djutugwj59ptctsrakyyw",
    code_hash:
      "ad91060456344fc8d8e93c0600a3957b8158605c044b3bef7048510b3157b807",
    image: "/luna.png",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Terra",
        source_denom: "uluna",
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Terra",
        source_denom:
          "ibc/D70B0FBF97AEB04491E9ABF4467A7F66CD6250F4382CE5192D856114B83738D2",
      },
    ],
  },
  {
    name: "UST",
    address: "secret129h4vu66y3gry6wzwa24rw0vtqjyn8tujuwtn9",
    code_hash:
      "ad91060456344fc8d8e93c0600a3957b8158605c044b3bef7048510b3157b807",
    image: "/ust.png",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Terra",
        source_denom: "uusd",
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Terra",
        source_denom:
          "ibc/4294C3DB67564CF4A0B2BFACC8415A59B38243F6FF9E288FBA34F9B4823BA16E",
      },
    ],
  },
  {
    name: "OSMO",
    address: "secret1zwwealwm0pcl9cul4nt6f38dsy6vzplw8lp3qg",
    code_hash:
      "ad91060456344fc8d8e93c0600a3957b8158605c044b3bef7048510b3157b807",
    image: "/osmo.jpeg",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Osmosis",
        source_denom: "uosmo",
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Osmosis",
        source_denom:
          "ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B",
      },
    ],
  },
  {
    name: "DVPN",
    address: "secret1k8cge73c3nh32d4u0dsd5dgtmk63shtlrfscj5",
    code_hash:
      "ad91060456344fc8d8e93c0600a3957b8158605c044b3bef7048510b3157b807",
    image: "/dvpn.jpeg",
    decimals: 6,
    deposit_from: [
      {
        soure_chain_name: "Sentinel",
        source_denom: "udvpn",
      },
    ],
    withdraw_to: [
      {
        destination_chain_name: "Sentinel",
        source_denom:
          "ibc/E83107E876FF194B54E9AC3099E49DBB7728156F250ABD3E997D2B7E89E0810B",
      },
    ],
  },
];

export type Chain = {
  /** display name of the chain */
  chain_name: string;
  /** channel_id on the chain */
  deposit_channel_id: string;
  /** gas limit for ibc transfer from the chain to Secret Network */
  deposit_gas: number;
  /** channel_id on Secret Network */
  withdraw_channel_id: string;
  /** gas limit for ibc transfer from Secret Network to the chain */
  withdraw_gas: number;
  /** bech32 prefix of addresses on the chain */
  bech32_prefix: string;
  /** logo of the chain */
  chain_image: string;
  /** chain-id of the chain */
  chain_id: string;
  /** lcd url of the chain */
  lcd: string;
  /** rpc url of the chain */
  rpc: string;
};

export const chains: { [chain_name: string]: Chain } = {
  "Secret Network": {
    chain_name: "Secret Network",
    deposit_channel_id: "",
    deposit_gas: 0,
    withdraw_channel_id: "",
    withdraw_gas: 0,
    chain_id: "secret-4",
    bech32_prefix: "secret",
    lcd: "https://bridge-api-manager.azure-api.net",
    rpc: "https://rpc-secret.keplr.app",
    chain_image: "/scrt.svg",
  },
  "Cosmos Hub": {
    chain_name: "Cosmos Hub",
    deposit_channel_id: "channel-235",
    deposit_gas: 110_000,
    withdraw_channel_id: "channel-0",
    withdraw_gas: 30_000,
    chain_id: "cosmoshub-4",
    bech32_prefix: "cosmos",
    lcd: "https://lcd-cosmoshub.keplr.app",
    rpc: "https://rpc-cosmoshub.keplr.app",
    chain_image: "/atom.jpg",
  },
  Terra: {
    chain_name: "Terra",
    deposit_channel_id: "channel-16",
    deposit_gas: 110_000,
    withdraw_channel_id: "channel-2",
    withdraw_gas: 30_000,
    chain_id: "columbus-5",
    bech32_prefix: "terra",
    lcd: "https://lcd-columbus.keplr.app",
    rpc: "https://rpc-columbus.keplr.app",
    chain_image: "/terra.jpg",
  },
  Osmosis: {
    chain_name: "Osmosis",
    deposit_channel_id: "channel-88",
    deposit_gas: 1_500_000,
    withdraw_channel_id: "channel-1",
    withdraw_gas: 30_000,
    chain_id: "osmosis-1",
    bech32_prefix: "osmo",
    lcd: "https://lcd-osmosis.keplr.app",
    rpc: "https://rpc-osmosis.keplr.app",
    chain_image: "/osmo.jpeg",
  },
  Sentinel: {
    chain_name: "Sentinel",
    deposit_channel_id: "channel-50",
    deposit_gas: 110_000,
    withdraw_channel_id: "channel-3",
    withdraw_gas: 30_000,
    chain_id: "sentinelhub-2",
    bech32_prefix: "sent",
    lcd: "https://lcd-sentinel.keplr.app",
    rpc: "https://rpc-sentinel.keplr.app",
    chain_image: "/dvpn.jpeg",
  },
};
