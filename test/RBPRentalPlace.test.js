const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("RBPRentalPlace", () => {
  const deployBothFixture = async () => {
    const [deployer, account1, account2, account3] = await ethers.getSigners();

    const RaffleBotPass = await ethers.getContractFactory("RaffleBotPass");
    const raffleBotPass = await RaffleBotPass.deploy();

    await raffleBotPass.deployed();

    const RBPRentalPlace = await ethers.getContractFactory("RBPRentalPlace");
    const rbpRentalPlace = await RBPRentalPlace.deploy(raffleBotPass.address);

    await rbpRentalPlace.deployed();

    const options = {
      value: ethers.utils.parseEther("2.0")
    }
    let tx = await raffleBotPass.connect(account1).mint(options);

    await tx.wait();

    tx = await raffleBotPass.connect(account1).mint(options);

    await tx.wait();

    const tokenId1 = 1;
    const tokenId2 = 2;
    
    return { deployer, account1, account2, account3, raffleBotPass, rbpRentalPlace, tokenId1, tokenId2 }
  }

  const leaseCreatedFixture = async () => {
    const { deployer, account1, account2, account3, raffleBotPass, rbpRentalPlace, tokenId1, tokenId2 } = await loadFixture(deployBothFixture);

    const expiresInDays = 1;
    const rentInEther = 100;

    await rbpRentalPlace.connect(account1).createLease(tokenId1, expiresInDays, rentInEther);

    const tokenListed = tokenId1;
    const tokenNotListed = tokenId2;

    return { deployer, account1, account2, account3, raffleBotPass, rbpRentalPlace, tokenListed, tokenNotListed, expiresInDays, rentInEther };
  }

  const leaseAcceptedFixture = async () => {
    const { deployer, account1, account2, account3, raffleBotPass, rbpRentalPlace, tokenListed, tokenNotListed, expiresInDays, rentInEther }
      = await loadFixture(leaseCreatedFixture);

    await raffleBotPass.connect(account1).approve(rbpRentalPlace.address, tokenListed);
    
    const options = {
      value: ethers.utils.parseEther(rentInEther.toString())
    }

    await rbpRentalPlace.connect(account2).acceptLease(tokenListed, options);

    return { deployer, account1, account2, account3, raffleBotPass, rbpRentalPlace, tokenListed, tokenNotListed, expiresInDays, rentInEther };
  }

  describe("Initialize", () => {
      it("'MIN_RENTAL_DAYS' should be 1", async () => {
        const { rbpRentalPlace } = await loadFixture(deployBothFixture);

        expect(await rbpRentalPlace.MIN_RENTAL_DAYS()).to.equal(1);
      })
      it("'raffleBotPass' should be address of raffleBotPass contract", async () => {
        const { raffleBotPass, rbpRentalPlace } = await loadFixture(deployBothFixture);

        expect(await rbpRentalPlace.raffleBotPass()).to.equal(raffleBotPass.address);
      })
  })

  describe("createLease", () => {
    it("Owner should be able to create lease", async () => {
      const { rbpRentalPlace, tokenId1, account1 } = await loadFixture(deployBothFixture);
      
      const expiresInDays = 10;
      const rentInEther = 100;

      await expect(rbpRentalPlace.connect(account1).createLease(tokenId1, expiresInDays, rentInEther))
        .to.not.be.reverted;
    })

    it("Values for 'leases' should be set after creating lease", async () => {
      const { rbpRentalPlace, tokenId1, account1 } = await loadFixture(deployBothFixture);
      
      const expiresInDays = 10;
      const rentInEther = 100;

      await rbpRentalPlace.connect(account1).createLease(tokenId1, expiresInDays, rentInEther);

      const lease = await rbpRentalPlace.leases(tokenId1);

      expect(lease.rent).to.equal(ethers.utils.parseEther(rentInEther.toString()));
      expect(lease.expiresInDays).to.equal(expiresInDays);
    })

    it("Should fail when try to create lease for others", async () => {
      const { rbpRentalPlace, tokenId1, account2 } = await loadFixture(deployBothFixture);
      
      const expiresInDays = 10;
      const rentInEther = 100;

      await expect(rbpRentalPlace.connect(account2).createLease(tokenId1, expiresInDays, rentInEther))
        .to.be.revertedWith("RBPRentalPlace.createLease: Caller is not the owner of the token");
      
    })

    it("Should fail when 'expiresInDays' is less than 'MIN_RENTAL_DAYS'", async () => {
      const { rbpRentalPlace, tokenId1, account1 } = await loadFixture(deployBothFixture);

      const expiresInDays = 0;
      const rentInEther = 100;

      await expect(rbpRentalPlace.connect(account1).createLease(tokenId1, expiresInDays, rentInEther))
        .to.be.revertedWith("RBPRentalPlace.createLease: rental period too short");
    })
  })

  describe("revokeLease", () => {
    it("Owner should be able to revoke lease", async () => {
      const { rbpRentalPlace, tokenListed, account1 } = await loadFixture(leaseCreatedFixture);

      await expect(rbpRentalPlace.connect(account1).revokeLease(tokenListed))
        .to.not.be.reverted;
    })

    it("Value for 'leases' should be reset", async () => {
      const { rbpRentalPlace, tokenListed, account1 } = await loadFixture(leaseCreatedFixture);

      await rbpRentalPlace.connect(account1).revokeLease(tokenListed);

      const lease = await rbpRentalPlace.leases(tokenListed);

      expect(lease.rent).to.equal("0");
      expect(lease.expiresInDays).to.equal("0");
    })

    it("Should fail when try to revoke lease for others", async () => {
      const { rbpRentalPlace, tokenListed, account2 } = await loadFixture(leaseCreatedFixture);
    
      await expect(rbpRentalPlace.connect(account2).revokeLease(tokenListed))
        .to.be.revertedWith("RBPRentalPlace.revokeLease: Caller is not the owner of the token");
    })
  })

  describe("acceptLease", () => {
    it("Owner should not be able to accept a lease", async () => {
      const { rbpRentalPlace, tokenListed, account1 } = await loadFixture(leaseCreatedFixture);

      await expect(rbpRentalPlace.connect(account1).acceptLease(tokenListed))
        .to.be.revertedWith("RBPRentalPlace.acceptLease: Cannot rent token of yourself");
    })

    it("Should not be able to accept a lease of a not-for-rent token", async () => {
      const { rbpRentalPlace, tokenNotListed, account2 } = await loadFixture(leaseCreatedFixture);

      await expect(rbpRentalPlace.connect(account2).acceptLease(tokenNotListed))
        .to.be.revertedWith("RentalPlace.acceptLease: the token is not for rent");
    })

    it("Should fail to accept a lease before approve()", async () => {
      const { rbpRentalPlace, tokenListed, account2, rentInEther } = await loadFixture(leaseCreatedFixture);

      const options = {
        value: ethers.utils.parseEther(rentInEther.toString())
      }

      await expect(rbpRentalPlace.connect(account2).acceptLease(tokenListed, options))
        .to.be.revertedWith("ERC4907: caller is not owner nor approved");
    })

    it("Should be able to accept a lease after approve()", async () => {
      const { raffleBotPass, rbpRentalPlace, tokenListed, account1, account2, rentInEther } = await loadFixture(leaseCreatedFixture);

      await raffleBotPass.connect(account1).approve(rbpRentalPlace.address, tokenListed);
      
      const options = {
        value: ethers.utils.parseEther(rentInEther.toString())
      }

      await expect(rbpRentalPlace.connect(account2).acceptLease(tokenListed, options))
        .to.not.be.reverted;
    })

    it("Lease should be reset after accepting a lease", async () => {
      const { raffleBotPass, rbpRentalPlace, tokenListed, account1, account2, rentInEther } = await loadFixture(leaseCreatedFixture);

      await raffleBotPass.connect(account1).approve(rbpRentalPlace.address, tokenListed);
      
      const options = {
        value: ethers.utils.parseEther(rentInEther.toString())
      }

      await rbpRentalPlace.connect(account2).acceptLease(tokenListed, options);

      const lease = await rbpRentalPlace.leases(tokenListed);
      expect(lease.rent).to.equal("0");
      expect(lease.expiresInDays).to.equal("0");
    })

    it("Balances of rentalPlace, owner, and tenant should change", async () => {
      const { raffleBotPass, rbpRentalPlace, tokenListed, account1, account2, rentInEther } = await loadFixture(leaseCreatedFixture);

      await raffleBotPass.connect(account1).approve(rbpRentalPlace.address, tokenListed);

      const rentInWei = ethers.utils.parseEther(rentInEther.toString());
      const options = {
        value: rentInWei
      }

      const feePercentage = 2;
      const fee = rentInWei * feePercentage / 100;
      const ownerIncome = rentInWei - fee;
      await expect(rbpRentalPlace.connect(account2).acceptLease(tokenListed, options))
        .to.changeEtherBalances(
            [rbpRentalPlace, account1, account2], 
            [fee.toString(), ownerIncome.toString(), (rentInWei * -1).toString()]
          );
    })
  })

  describe("withdrawFunds", () => {
    it("Deployer should be able to withdrawFunds", async () => {
      const { deployer, account1, rbpRentalPlace } = await loadFixture(leaseAcceptedFixture);
  
      await expect(rbpRentalPlace.connect(deployer).withdrawFunds())
      .to.changeEtherBalance(deployer, ethers.utils.parseEther("2"));
    })
    it("Anyone other than deployer's call to withdrawFunds should fail", async () => {
      const { account1, rbpRentalPlace } = await loadFixture(leaseAcceptedFixture);
  
      await expect(rbpRentalPlace.connect(account1).withdrawFunds())
      .to.be.revertedWith("Ownable: caller is not the owner");
    })
  })
})

