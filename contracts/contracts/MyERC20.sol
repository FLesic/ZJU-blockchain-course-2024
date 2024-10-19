// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {

    }
    // 分配ERC20积分给地址customer
    function sendErc20(address customer, uint256 amount) external{
        _mint(customer, amount);
    }
}
