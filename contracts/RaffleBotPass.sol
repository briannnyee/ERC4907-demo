//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./ERC4907.sol";

contract RaffleBotPass is ERC4907 {
    using Counters for Counters.Counter;

    uint256 public constant MINT_PRICE = 2 ether;

    Counters.Counter private _tokenIds;

    constructor() 
        ERC721("RaffleBotPass", "RBP")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint() public payable returns (uint256) {
        require(msg.value == MINT_PRICE, "RaffleBotPass.mint: insufficient ethers");

        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();
        _mint(msg.sender, newTokenId);

        return newTokenId;
    }

    function withdrawFunds() public onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
}