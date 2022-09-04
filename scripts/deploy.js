// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const logDeployInfo = require("./logDeployInfo");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  let beforeDeployBalance = await deployer.getBalance();

  console.log(`Deploying with address ${deployer.address}`);
  console.log(`Address balance: ${hre.ethers.utils.formatEther(beforeDeployBalance)} eth`);

  const RaffleBotPass = await hre.ethers.getContractFactory("RaffleBotPass");
  const raffleBotPass = await RaffleBotPass.deploy();

  console.log(`Deploying contract "RaffleBotPass"...`);
  await raffleBotPass.deployed();
  console.log(`Contract "RaffleBotPass" deployed at ${raffleBotPass.address}`);

  let firstLog = {
    contract: "RaffleBotPass",
    address: raffleBotPass.address,
  };

  const RBPRentalPlace = await hre.ethers.getContractFactory("RBPRentalPlace");
  const rbpRentalPlace = await RBPRentalPlace.deploy(raffleBotPass.address);

  console.log(`Deploying contract "RBPRentalPlace"...`);
  await rbpRentalPlace.deployed();
  console.log(`Contract "RBPRentalPlace" deployed at ${rbpRentalPlace.address}`);

  let secondLog = {
    contract: "RBPRentalPlace",
    address: rbpRentalPlace.address,
  };


  logDeployInfo("deploymentInfo.json", {
    1: firstLog,
    2: secondLog
  })

  let afterDeployBalance = await deployer.getBalance();
  console.log(`Remaining balance: ${hre.ethers.utils.formatEther(afterDeployBalance)} eth`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
