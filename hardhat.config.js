require("@nomicfoundation/hardhat-toolbox");
const { MNEMONIC, PRIVATE_KEY, INFURA_API_KEY, IMPORT_WEB3, ETHERSCAN_API_KEY } = require('./secrets.json');


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  },
  defaultNetwork: "localhost", // <-- change here for other network, default use hardhat network.
  networks: {
  	localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 1,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 3,
      gasPrice: 20000000000,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 4,
      gasPrice: 20000000000,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      chainId: 5,
      gasPrice: 20000000000,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 1000000000,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      // accounts: {MNEMONIC: MNEMONIC}
      accounts: [PRIVATE_KEY]
    },
  },
  solidity: {
  version: "0.8.9",
  settings: {
    optimizer: {
      enabled: true
    }
   }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }
};
