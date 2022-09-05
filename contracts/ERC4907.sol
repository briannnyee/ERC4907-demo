// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IERC4907.sol";

abstract contract ERC4907 is ERC721, IERC4907, AccessControl {
    struct UserInfo 
    {
        address user;   // address of user role
        uint64 starts;  // unix timestamp, user starts
        uint64 expires; // unix timestamp, user expires
        uint256 rent;   // amount of rent
    }

    mapping (uint256  => UserInfo) internal _users;


    /// @notice set the user and expires of an NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid NFT
    /// @param rent  The rent of the NFT
    function setUser(
        uint256 tokenId, 
        address user, 
        uint64 expires, 
        uint256 rent
    ) public {
        UserInfo storage info = _users[tokenId];
        info.rent = rent;
        setUser(tokenId, user, expires);
    }
    
    /// @notice set the user and expires of an NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid NFT
    /// @param user  The new user of the NFT
    /// @param expires  UNIX timestamp, The new user could use the NFT before expires
    function setUser(uint256 tokenId, address user, uint64 expires) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC4907: caller is not owner nor approved");
        require(userOf(tokenId) == address(0), "ERC4907: double renting");

        uint64 starts = uint64(block.timestamp);
        require(expires > starts, "ERC4907: invalid expires");
        UserInfo storage info =  _users[tokenId];
        info.user = user;
        info.starts = starts;
        info.expires = expires;
        emit UpdateUser(tokenId, user, expires);
    }

    /// @notice revoke the user and expires of an NFT
    /// @dev The zero address indicates there is no user
    /// Throws if `tokenId` is not valid NFT
    /// charges 1% fee
    function revokeUser(uint256 tokenId) public payable {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC4907: caller is not owner nor approved");
        
        address user = userOf(tokenId);
        require(user != address(0), "ERC4907: token is not in use");

        uint256 starts = userStarts(tokenId);
        uint256 expires = userExpires(tokenId);
        uint256 rent = userRent(tokenId);
        uint256 totalPeriod = expires - starts;
        uint256 remainingPeriod = expires - block.timestamp;
        uint256 refundedRent = rent * remainingPeriod / totalPeriod;
        require(msg.value >= refundedRent, "ERC4907: insufficient refunded rent");
        uint256 fee = msg.value * 1 / 100;
        uint256 finalRefundedRent = refundedRent - fee;

        delete _users[tokenId];
        emit UpdateUser(tokenId, address(0), 0);

        (bool success, ) = user.call{value: finalRefundedRent}("");
        require(success, "ERC4907: refund ether to user failed");
    }

    /// @notice Get the user address of an NFT
    /// @dev The zero address indicates that there is no user or the user is expired
    /// @param tokenId The NFT to get the user address for
    /// @return The user address for this NFT
    function userOf(uint256 tokenId) public view returns(address){
        if( uint256(_users[tokenId].expires) >=  block.timestamp){
            return  _users[tokenId].user;
        }
        else{
            return address(0);
        }
    }

    /// @notice Get the user starts of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user starts for
    /// @return The user starts for this NFT
    function userStarts(uint256 tokenId) public view returns(uint256){
        return _users[tokenId].starts;
    }

    /// @notice Get the user expires of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user expires for
    /// @return The user expires for this NFT
    function userExpires(uint256 tokenId) public view returns(uint256){
        return _users[tokenId].expires;
    }

    /// @notice Get the user starts of an NFT
    /// @dev The zero value indicates that there is no user
    /// @param tokenId The NFT to get the user starts for
    /// @return The user rent for this NFT
    function userRent(uint256 tokenId) public view returns(uint256){
        return _users[tokenId].rent;
    }

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return interfaceId == type(IERC4907).interfaceId || super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);

        require(userOf(tokenId) == address(0), "ERC4907: token still in use");

        if (from != to && _users[tokenId].user != address(0)) {
            delete _users[tokenId];
            emit UpdateUser(tokenId, address(0), 0);
        }
    }
} 