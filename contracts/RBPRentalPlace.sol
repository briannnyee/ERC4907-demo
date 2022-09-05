// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RaffleBotPass.sol";

contract RBPRentalPlace is Ownable {

    struct LeaseInfo {
        uint256 rent;
        uint64 expiresInDays;
    }

    uint64 public constant MIN_RENTAL_DAYS = 1;

    mapping(uint256 => LeaseInfo) public leases;
    RaffleBotPass public raffleBotPass;

    constructor(RaffleBotPass _raffleBotPass) {
        raffleBotPass = _raffleBotPass;
    }

    /**
     * @notice create lease of `_tokenId`
     * @dev create lease of `_tokenId`, 
     * caller must be the owner of `_tokenId` 
     * and rental period needs to be greater than MIN_RENTAL_DAYS
     */
    function createLease(
        uint256 _tokenId,
        uint64 _expiresInDays, 
        uint256 _rentInEther
    ) public {
        require(raffleBotPass.ownerOf(_tokenId) == msg.sender, "RBPRentalPlace.createLease: Caller is not the owner of the token");
        require(_expiresInDays >= MIN_RENTAL_DAYS, "RBPRentalPlace.createLease: rental period too short");
        LeaseInfo storage lease = leases[_tokenId];
        lease.rent = _rentInEther * (1 ether);
        lease.expiresInDays = _expiresInDays;
    }

    /**
     * @notice revoke lease of `_tokenId`
     * @dev revoke lease of `_tokenId`, 
     * caller must be the owner of `_tokenId`
     */
    function revokeLease(
        uint256 _tokenId
    ) public {
        require(raffleBotPass.ownerOf(_tokenId) == msg.sender, "RBPRentalPlace.revokeLease: Caller is not the owner of the token");
        delete leases[_tokenId];
    }

    /**
     * @dev accept lease of `_tokenId`
     * charges 2% fees
     */
    function acceptLease(uint256 _tokenId) public payable {
        require(raffleBotPass.ownerOf(_tokenId) != msg.sender, "RBPRentalPlace.acceptLease: Cannot rent token of yourself");
        require(leases[_tokenId].expiresInDays != 0, "RentalPlace.acceptLease: the token is not for rent");
        uint256 rent = leases[_tokenId].rent;
        require(msg.value >= rent, "RentalPlace.acceptLease: insufficient ethers");

        uint64 expiresInDays = leases[_tokenId].expiresInDays;
        uint64 expires = uint64(block.timestamp) + expiresInDays * (1 days);

        raffleBotPass.setUser(_tokenId, msg.sender, expires, rent);

        uint256 fee = msg.value * 2 / 100;
        uint256 ownerIncome = msg.value - fee;
        address payable tokenOwner = payable(raffleBotPass.ownerOf(_tokenId));
        
        // lease is taken, so remove it
        delete leases[_tokenId];

        (bool success, ) = tokenOwner.call{value: ownerIncome}("");
        require(success, "RentalPlace.acceptLease: transfer ether to owner failed");
    }

    function withdrawFunds() public onlyOwner {
        address owner = owner();
        payable(owner).transfer(address(this).balance);
    }
}