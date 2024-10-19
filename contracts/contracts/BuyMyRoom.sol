// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "./MyERC20.sol";
import {MyERC721} from "./MyERC721.sol";

// Uncomment the line to use openzeppelin/ERC721,ERC20
// You can use this dependency directly because it has been installed by TA already
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BuyMyRoom {

    // use a event if you want
    // to represent time you can choose block.timestamp
    event HouseListed(uint256 tokenId, uint256 price, address owner);

    // maybe you need a struct to store car information
    struct House {
        address owner; // 当前的房屋拥有者
        uint256 listedTimestamp; // 挂单时间戳
        uint256 houseID; // 房屋的ID
        bool isListed; // 状态：是否挂单
        uint256 price; // 当前房屋价格，单位wei
        uint256 ethPrice; // 当前房屋价格，单位eth
        uint256 erc20Price; // 当前房屋价格erc20积分价格，默认是2*10^18倍price wei，即1 eth = 2 erc20
        // ...
    }

    House[] public houses; // 房屋列表集合
    uint256 public ethToErc20 =2 ; // 默认1以太币 = 2 erc20积分, 10^18 wei = 2 erc20积分
    uint256 public houseNum = 4;
    uint256 public feePercentage = 10; // 平台收取固定比例手续费 例如5代表5%
    address public manager; // 平台方，用于收取手续费和调整积分比例
    MyERC20 public myERC20; // Erc20合约
    MyERC721 public myERC721; // Erc721合约

    modifier onlyManager {
        require(msg.sender == manager);
        _;
    }
    constructor(){
        manager = msg.sender;
        myERC20 = new MyERC20("ZJUToken", "ZJUTokenSymbol");
        myERC721 = new MyERC721("House", "HouseSymbol");
        // 假设有4个房子，起初都归属于平台方，一开始平台方出售房子，假设房子价格都是0
        // 主要用于用户免费领取房子，测试目的
        for(uint256 i = 0; i < houseNum; i++)
        {
            houses.push(House({
                houseID: i,
                owner: manager,
                isListed: false,
                price: 0,
                ethPrice: 0,
                erc20Price: 0,
                listedTimestamp: block.timestamp
            }));
            myERC721.createHouseItem(manager, i);
        }
    }

    function helloworld() pure external returns(string memory) {
        return "hello world";
    }

    // ...
    // TODO add any logic if you want

    // 返回房屋集合的信息
    function getHouses() view external returns(House[] memory) {
        return houses;
    }

    // 改变房子的出售状态
    function changeHouseState(uint256 houseID) external{
        require(houses[houseID].owner == msg.sender, "You don't own the house");
        if(houses[houseID].isListed == true) // 结束挂单
            houses[houseID].isListed = false;
        else
        {
            houses[houseID].isListed = true; // 挂单房子
            houses[houseID].listedTimestamp = block.timestamp; // 修改挂单时间戳
        }
    }

    // 改变挂单房子的价钱
    function changeHousePrice(uint256 houseID, uint256 price) external{
        // 这里传进来的price是以eth为单位的
        require(houses[houseID].owner == msg.sender, "You don't own the house");
        require(houses[houseID].isListed == true, "House not yet for sale");
        houses[houseID].price = price * 10 ** 18; // 1eth = 10**18 wei
        houses[houseID].ethPrice = price;
        houses[houseID].erc20Price = price * ethToErc20 * 10 ** 18;
    }

    // 计算手续费 Ether
    function calculateFeeInEther(uint256 houseID) view public returns(uint256){
        return (houses[houseID].price * feePercentage + (block.timestamp - houses[houseID].listedTimestamp)) / 100;
    }
    // 计算手续费 Erc20
    function calculateFeeInErc20(uint256 houseID) view public returns(uint256){
        return (houses[houseID].erc20Price * feePercentage + (block.timestamp - houses[houseID].listedTimestamp)) / 100;
    }
    // 转换以太币为erc20
    function changeEth2Erc20() payable public {
        //将msg.value对应的eth转化为erc20积分
        uint256 erc20 = msg.value * ethToErc20;
        myERC20.sendErc20(msg.sender, erc20);
        //相当于将对应的eth转给平台方
        (bool success, ) = manager.call{value: msg.value}("");
        require(success, "Transaction failed for manager");
    }
    // 用以太币购买房子
    function buyHouseInEther(uint256 houseID) payable public {
        require(houses[houseID].isListed, "House not yet for sale");
        require(houses[houseID].owner != msg.sender, "You can not buy your own house");
        uint256 Fee = calculateFeeInEther(houseID); // 计算平台方小费
        uint256 payForSeller = houses[houseID].price - Fee; // 计算出售方最终获得的eth
        require(msg.value >= houses[houseID].price, "Not enough ether sent");

        // 支付给卖家
        (bool success, ) = houses[houseID].owner.call{value: payForSeller}("");
        require(success, "Transaction failed for seller");
        // 支付手续费给平台
        (success, ) = manager.call{value: Fee}("");
        require(success, "Transaction failed for manager");
        // 改变房子的拥有权，从挂单中撤回
        myERC721.transferFrom(houses[houseID].owner, msg.sender, houseID);
        houses[houseID].owner = msg.sender;
        houses[houseID].isListed = false;
        houses[houseID].price = 0;
        houses[houseID].ethPrice = 0;
        houses[houseID].erc20Price = 0;
    }
    // 用Erc20积分购买房子
    function buyHouseInErc20(uint256 houseID) public{
        require(houses[houseID].isListed, "House not yet for sale");
        require(houses[houseID].owner != msg.sender, "You can not buy your own house");
        uint256 Fee = calculateFeeInErc20(houseID); // 计算平台方小费
        uint256 payForSeller = houses[houseID].erc20Price - Fee; // 计算出售者最终所得
        require(myERC20.balanceOf(msg.sender) >= houses[houseID].erc20Price, "Not enough token sent");

        // 委托转账
        myERC20.transferFrom(msg.sender, address(this), houses[houseID].erc20Price);
        myERC20.transfer(manager, Fee); // 给平台的小费
        myERC20.transfer(houses[houseID].owner, payForSeller); // 给出售者的

        // 改变房子的拥有权，从挂单中撤回
        myERC721.transferFrom(houses[houseID].owner, msg.sender, houseID);
        houses[houseID].owner = msg.sender;
        houses[houseID].isListed = false;
        houses[houseID].price = 0;
        houses[houseID].ethPrice = 0;
        houses[houseID].erc20Price = 0;
    }
}