pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
contract MyERC721 is ERC721URIStorage {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    // 以houseID作为房子的唯一标识，分配给购买者或平台方
    function createHouseItem(address to, uint256 houseID) public {
        uint256 tokenId = houseID;
        _safeMint(to, tokenId);
    }
}