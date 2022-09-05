const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("RaffleBotPass", () => {
  const deployRaffleBotPassFixture = async () => {
    const [deployer, account1, account2, account3] = await ethers.getSigners();

    const RaffleBotPass = await ethers.getContractFactory("RaffleBotPass");
    const raffleBotPass = await RaffleBotPass.deploy();

    await raffleBotPass.deployed();
    
    return { deployer, account1, account2, account3, raffleBotPass }
  }

  const deployedAndMintedFixture = async () => {
    const { deployer, account1, account2, account3, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

    const options = {
      value: ethers.utils.parseEther("2.0")
    }
    let tx = await raffleBotPass.connect(account1).mint(options);

    await tx.wait();

    tx = await raffleBotPass.connect(account1).mint(options);

    await tx.wait();

    const tokenId1 = 1;
    const tokenId2 = 2;

    return { deployer, account1, account2, account3, raffleBotPass, tokenId1, tokenId2 }
  }

  const userSetFixture = async () => {
    const { deployer, account1, account2, account3, raffleBotPass, tokenId1, tokenId2 } = await loadFixture(deployedAndMintedFixture);

    const block = await ethers.provider.getBlock();
    const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
    const setUserSignature = "setUser(uint256,address,uint64)";
    const tokenIdSet = tokenId1;
    const tokenIdNotSet = tokenId2;
    await raffleBotPass.connect(account1)[setUserSignature](tokenIdSet, account2.address, expires);

    return { deployer, account1, account2, account3, raffleBotPass, expires, tokenIdSet, tokenIdNotSet }
  }

  describe("initialize", () => {
    it("Deployer should have DEFAULT_ADMIN_ROLE role", async () => {
      const { deployer, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const DEFAULT_ADMIN_ROLE = await raffleBotPass.DEFAULT_ADMIN_ROLE();
      const res = await raffleBotPass.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);

      expect(res).to.be.true;
    })

    it("MINT_PRICE should be 2 ethers", async () => {
      const { raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const mint_price = parseInt(ethers.utils.formatEther(await raffleBotPass.MINT_PRICE()));

      expect(mint_price).to.equal(2);
    })
  })

  describe("mint", () => {
    it("Deployer should be able to mint", async () => {
      const { deployer, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const options = {
        value: ethers.utils.parseEther("2.0")
      }
      const tx = await raffleBotPass.mint(options);

      await tx.wait();

      expect(await raffleBotPass.ownerOf(1)).to.equal(deployer.address);
    })

    it("Buyer should be able to mint", async () => {
      const { account1, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const options = {
        value: ethers.utils.parseEther("2.0")
      }
      const tx = await raffleBotPass.connect(account1).mint(options);

      await tx.wait();

      expect(await raffleBotPass.ownerOf(1)).to.equal(account1.address);
    })

    it("Should failed with insufficient ethers", async () => {
      const { account1, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const options = {
        value: ethers.utils.parseEther("1.0")
      }
      await expect(raffleBotPass.connect(account1).mint(options)).to.be.revertedWith("RaffleBotPass.mint: insufficient ethers");
    })
  })

  describe("withdrawFunds", () => {
    it("Deployer should be able to withdrawFunds", async () => {
      const { deployer, account1, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const options = {
        value: ethers.utils.parseEther("2")
      }
      await raffleBotPass.connect(account1).mint(options);

      await expect(raffleBotPass.connect(deployer).withdrawFunds())
        .to.changeEtherBalance(deployer, ethers.utils.parseEther("2"));
    })
    it("Account1 call to withdrawFunds should fail", async () => {
      const { account1, raffleBotPass } = await loadFixture(deployRaffleBotPassFixture);

      const options = {
        value: ethers.utils.parseEther("2")
      }
      await raffleBotPass.connect(account1).mint(options);

      await expect(raffleBotPass.connect(account1).withdrawFunds())
        .to.be.reverted;
    })
  })

  describe("ERC4907", () => {

    describe("setUser", () => {
      it("Owner should be able to set user without rent", async () => {
        const { account1, account2, raffleBotPass } = await loadFixture(deployedAndMintedFixture);

        const block = await ethers.provider.getBlock();
        const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
        const setUserSignature = "setUser(uint256,address,uint64)";
        const tokenId = 1;
        await expect(raffleBotPass.connect(account1)[setUserSignature](tokenId, account2.address, expires)).to.not.be.reverted;
        expect(await raffleBotPass.userOf(1)).to.equal(account2.address);
        expect(await raffleBotPass.userRent(1)).to.equal(0);
      })

      it("Owner should be able to set user with rent", async () => {
        const { account1, account2, raffleBotPass } = await loadFixture(deployedAndMintedFixture);

        const block = await ethers.provider.getBlock();
        const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
        const setUserSignature = "setUser(uint256,address,uint64,uint256)";
        const tokenId = 1;
        const rent = ethers.utils.parseEther("1");
        await expect(raffleBotPass.connect(account1)[setUserSignature](tokenId, account2.address, expires, rent)).to.not.be.reverted;
        expect(await raffleBotPass.userOf(1)).to.equal(account2.address);
        expect(await raffleBotPass.userRent(1)).to.equal(rent);
      })

      it("Not Owner should not be able to set user", async () => {
        const { account1, account2, raffleBotPass } = await loadFixture(deployedAndMintedFixture);

        const block = await ethers.provider.getBlock();
        const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
        const setUserSignature = "setUser(uint256,address,uint64)";
        const tokenId = 1;
        await expect(raffleBotPass.connect(account2)[setUserSignature](tokenId, account2.address, expires))
          .to.be.reverted;
      })

      it("Should emit UpdateUser event", async () => {
        const { account1, account2, raffleBotPass } = await loadFixture(deployedAndMintedFixture);

        const block = await ethers.provider.getBlock();
        const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
        const setUserSignature = "setUser(uint256,address,uint64)";
        const tokenId = 1;
        await expect(raffleBotPass.connect(account1)[setUserSignature](tokenId, account2.address, expires))
          .to.emit(raffleBotPass, "UpdateUser")
          .withArgs(1, account2.address, expires);
      })
    })

    describe("revokeUser", () => {
      it("Not owner should not be able to revoke user", async () => {
        const { deployer, raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        await expect(raffleBotPass.revokeUser(tokenIdSet))
          .to.be.revertedWith("ERC4907: transfer caller is not owner nor approved");
      })

      it("Owner should be able to revoke user if user has been set", async () => {
        const { account1, raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);

        await expect(raffleBotPass.connect(account1).revokeUser(tokenIdSet))
          .to.not.be.reverted;
      })

      it("Owner should not be able to revoke user if user has not been set", async () => {
        const { account1, raffleBotPass, tokenIdNotSet } = await loadFixture(userSetFixture);

        await expect(raffleBotPass.connect(account1).revokeUser(tokenIdNotSet))
          .to.be.revertedWith("ERC4907: token is not in use");
      })

      it("Owner should refund ethers when revoking user", async () => {
        const { account1, account2, raffleBotPass, tokenIdNotSet } = await loadFixture(userSetFixture);
        
        // set user of tokenIdNotSet with rent
        const block = await ethers.provider.getBlock();
        const expires = block.timestamp + 3600 * 24 * 1; // + 1 day
        const setUserSignature = "setUser(uint256,address,uint64,uint256)";
        const rent = ethers.utils.parseEther("100");
        const options = {
          value: rent
        }
        await raffleBotPass.connect(account1)[setUserSignature](tokenIdNotSet, account2.address, expires, rent);    

        const finalRefundedRent = ethers.utils.parseEther("99");
        await expect(raffleBotPass.connect(account1).revokeUser(tokenIdNotSet, options))
          .to.changeEtherBalance(account1, ethers.utils.parseEther("-100"));
      })
    })

    describe("userOf", () => {
      it("Should not be address(0) if not expired", async () => {
        const { account2, raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        expect(await raffleBotPass.userOf(tokenIdSet)).to.equal(account2.address);
      })

      it("Should be address(0) if expired", async () => {
        const { raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        const block = await ethers.provider.getBlock();
        const amount = 3600 * 24 * 2; // 2 days later
        // time-traveling
        await ethers.provider.send("evm_increaseTime", [amount]);
        await ethers.provider.send("evm_mine");
        expect(await raffleBotPass.userOf(tokenIdSet)).to.equal(ethers.constants.AddressZero);
      })
    })

    describe("UserInfo", () => {
      it("'user' should be set", async () => {
        const { account2, raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        expect(await raffleBotPass.userOf(tokenIdSet)).to.equal(account2.address);
      })

      it("'expires' should be set", async () => {
        const { raffleBotPass, tokenIdSet, expires } = await loadFixture(userSetFixture);
        
        expect(await raffleBotPass.userExpires(tokenIdSet)).to.equal(expires);
      })

      it("'starts' should be set", async () => {
        const { raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        expect(await raffleBotPass.userStarts(tokenIdSet)).to.not.equal(0);
      })

      it("'rent' should be set", async () => {
        const { raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        expect(await raffleBotPass.userRent(tokenIdSet)).to.equal(0);
      })
    })

    describe("malicious rental", ()  => {
      it("Should not be able to rent twice at a time", async () => {
        const { account1, account3, raffleBotPass, tokenIdSet, expires } = await loadFixture(userSetFixture);
        
        const setUserSignature = "setUser(uint256,address,uint64)";
        await expect(raffleBotPass.connect(account1)[setUserSignature](tokenIdSet, account3.address, expires))
          .to.be.revertedWith("ERC4907: double renting");
      })

      it("Should input valid 'expires' value", async () => {
        const { account1, account2, raffleBotPass, tokenIdNotSet } = await loadFixture(userSetFixture);
        
        const setUserSignature = "setUser(uint256,address,uint64)";
        await expect(raffleBotPass.connect(account1)[setUserSignature](tokenIdNotSet, account2.address, 0))
          .to.be.revertedWith("ERC4907: invalid expires");
      })

      it("Should not be able to transfer before expires", async () => {
        const { account1, account2, raffleBotPass, tokenIdSet } = await loadFixture(userSetFixture);
        
        const safeTransferFromSignature = "safeTransferFrom(address,address,uint256)"
        await expect(raffleBotPass.connect(account1)[safeTransferFromSignature](account1.address, account2.address, tokenIdSet))
          .to.be.revertedWith("ERC4907: token still in use");
      })
    })
  })
})