# ZJU-blockchain-course-2024

⬆ 可以️修改成你自己的项目名。

> 第二次作业要求（以下内容提交时可以删除）：
> 
> 去中心化房屋购买系统，参与方包括：房屋拥有者，有购买房屋需求的用户
>
> 建立一个简易的房屋出售系统，在网站中：
> - 创建一个（ERC721）合约，在合约中发行房屋集合，每个NFT代表一栋房屋。让部分用户免费领取部分房屋NFT，用于后面的测试。
> - 在网站中，用户可以出售，或者使用测试以太币购买房屋。每个用户可以： 
>  1. 用户查看自己拥有的房产列表。并可以挂单出售自己的房屋（挂单包含价格等信息）。
>  2. 用户查看所有出售中的房产，并查询一栋房产的主人，及各种挂单信息。
>  3. 用户选择支付房屋价格对应的测试以太币，购买某个其他用户出售的房产。购买后房产拥有权应当发生变化。
>  4. 平台收取手续费：在一个房产出售完成时，用户支付的部分测试以太币（=某栋房产在平台上的挂单时长（timestamp）* 固定比例 * 房产价格）应该被转入某个特定账户（如合约部署者）。
      。
> - （Bonus，如果想要完成Bonus，可以直接将功能整合进上述要求中）发行一个（ERC20）合约，允许用户将测试以太币兑换成ERC20积分，并使用ERC20积分完成购买房屋的流程。
> - 请大家专注于功能实现，网站UI美观程度不纳入评分标准，但要让用户能够舒适操作。简便起见，可以在网上找图片代表不同房产，不需要将图片上链。

**以下内容为作业仓库的README.md中需要描述的内容。请根据自己的需要进行修改并提交。**

作业提交方式为：**提交视频文件**和**仓库的链接**到指定邮箱。

## 如何运行

补充如何完整运行你的应用。

1. 在本地启动ganache应用，修改端口号为8545

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```

3. 在 `./contracts` 目录中编译合约，运行如下的命令：
    ```bash
    npx hardhat compile
    ```

4. 在`./contracts/hardhat.config.ts`文件中修改url端口号为8545，并将其中accounts换成本地ganache链上的某一个账户的私钥（例如第一个），这将会是合约的部署者地址

5. 在`./contracts`目录下部署合约，运行如下命令：

    ```shell
    npx hardhat run ./scripts/deploy.ts --network ganache
    ```

6. 此时命令行中会产生三个合约地址，一个是BuyMyRoom合约，一个是MyERC20合约，一个是MyERC721合约，将这两三个地址复制到`./frontend/src/utils/contracts-addresses.json`下的对应地址

    ![image-20241018131240043](assets/image-20241018131240043.png)

7. 将`./contracts/artifacts/contracts/BuyMyRoom.sol/BuyMyRoom.json`，`./contracts/artifacts/contracts/MyERC20.sol/MyERC20.json`以及`./contracts/artifacts/contracts/MyERC721.sol/MyERC721.json`的合约二进制文件复制到`./frontend/utils/abis`下

8. 在 `./frontend` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```

9. 在 `./frontend` 中启动前端程序，运行如下的命令：
    ```bash
    npm run start
    ```

10. 浏览器中启用小狐狸（Metamask），修改设置，添加本地测试网络，添加几个Ganache上的账号用作测试

    > 注：每一次切换账号，请刷新页面

## 功能实现分析

简单描述：项目完成了要求的哪些功能？每个功能具体是如何实现的？

建议分点列出。

1. 用户查看自己的房产列表

后端：

智能合约中使用结构体具体表示房屋的信息，使用列表存储房屋集合

```solidity
// BuyMyRoom.sol
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
```

在`constructor()`函数中，创建myERC20合约（积分）和myERC721（tokenID）合约，假设起初有4个房子，都归属于平台方（合约部署者）。调用myERC721函数`createHouseItem`具体创建一个NFT房屋对象，都分配给平台方，后续由测试账户购买房子进行其余功能的测试。

```solidity
// MyERC721.sol
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
```

```solidity
// BuyMyRoom.sol
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
```

后续各种操作都会改变房屋的具体信息（例如以太币价格，拥有者，是否正在出售中等），我们使用`getHouses`函数返回房屋集合

```solidity
// BuyMyRoom.sol
// 返回房屋集合的信息
function getHouses() view external returns(House[] memory) {
	return houses;
}
```

前端：

前端主要是通过调用智能合约中的`getHouses`来获取房屋集合的数据，需要注意的是，由于后端传回来的数据类型`uint256`是``BigInt`类型，此类型无法直接通过前端渲染，需要使用`Number()`进行强制转化，地址信息（owner的地址）统一转化成小写，方便后续的比较。

```react
const getHouses = async () => {
    // 重新渲染房子列表
    const housesData = await buymyroomContract.methods.getHouses().call();
    // 映射数据并转换 BigInt 为 Number，地址统一转化为小写
    const processedHouses = (housesData as any).map((house: any) => ({
        ...house,
        owner:house.owner.toLowerCase(),
        price: Number(house.ethPrice),
        erc20Price: Number(house.erc20Price)/10**18,
        listedTimestamp: Number(house.listedTimestamp),
        houseID: Number(house.houseID),
    }));
    // 设置房屋集合
    setHouses(processedHouses);
    ...
}
```

在前端的具体渲染中，主要是通过遍历房屋集合，过滤不属于当前用户的房屋进行展示，将剩余的房屋和组件关联，进行展示：

```react
<div className="houses-container">
    {houses
        .filter((house: House) => house.owner === account)
        .map((house: House) => (
        <HouseCardLocal key={house.houseID} house={house}/>
    ))}
</div>
```

2. 用户挂单出售自己的房屋，用户撤销出售自己的房屋

后端：

调用`changeHouseState`函数改变房子的出售状态，原先挂单的房屋进行撤销，原先未挂单的房屋进行出售，同时将当前区块的时间戳作为房屋挂单的时间戳，用于后续手续费的相关计算。

```solidity
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
```

选择挂单出售自己的房屋，用户需要设置房屋的价格，智能合约中使用`changHousePrice`函数改变挂单房屋的价格

需要特别关注一下单位的变化，前端输入的价格是eth，而后端进行交易是以wei，所以需要进行单位转化，同时还需要根据eth和erc20Price之间的汇率计算房屋当前的erc20积分价格。

```solidity
// 改变挂单房子的价钱
function changeHousePrice(uint256 houseID, uint256 price) external{
    // 这里传进来的price是以eth为单位的
    require(houses[houseID].owner == msg.sender, "You don't own the house");
    require(houses[houseID].isListed == true, "House not yet for sale");
    houses[houseID].price = price * 10 ** 18; // 1eth = 10**18 wei
    houses[houseID].ethPrice = price;
    houses[houseID].erc20Price = price * ethToErc20 * 10 ** 18;
}
```

前端：

用户资产中的房子根据出售状态显示`出单`和`取消挂单`两个按钮，用户可以选择将资产中的房子进行挂单也可以取消出售中的房子。前端渲染主要使用了antd的按钮和对话框组件用以美化。

当用户选择`出单`时，弹出对话框需要用户输入相应的房屋价格以进行出售。

```react
<Button type="primary" onClick={() => handleButtonClick()}>{house.isListed ? '取消出单' : '出单'}</Button>

<Modal title="请输入您的出价(单位eth)：" open={isDialogOpen && !house.isListed}
    onOk={() => handleConfirmDialog1(house.houseID, userInput)} onCancel={handleCloseDialog}>
    <Input type="number" value={userInput} onChange={handleInputChange}/>
</Modal>

<Modal title="确认停止销售当前房子？" open={isDialogOpen && house.isListed}
    onOk={() => handleConfirmDialog2(house.houseID)} onCancel={handleCloseDialog}>
</Modal>
```

点击按钮后的处理逻辑主要就是调用后端的两个逻辑，需要关注选择出售房子时，ERC721需要进行认证操作，即允许房屋拥有者转移自己的NFT房屋资产：

- 出售房子：

  ```react
  const sellHouse = async (houseID: number, price: number) => {
      // 修改一个房屋状态为出单，同时设置价格
      if (account === '') {
          alert('You have not connected wallet yet.')
          return
      }
      if (buymyroomContract) {
          try {
              // 出售房子的时候，需要进行ERC721的认证，否则卖不了
              await myERC721Contract.methods.approve(buymyroomContract.options.address, houseID).send({
                  from: account
              }
                                                                                                     )
              // 切换房子的出售状态
              await buymyroomContract.methods.changeHouseState(houseID).send({
                  from: account
              })
              // 修改房屋的价格
              await buymyroomContract.methods.changeHousePrice(houseID, price).send({
                  from: account
              })
              // 重新获取房屋列表进行渲染
              await getHouses()
              alert('You will sell this house for ' + price + ' Ether')
          } catch (error: any) {
              alert(error.message)
          }
      } else {
          alert('contract doesn\'t exist')
      }
  }
  ```

- 取消出售房子（类似）

```solidity
const cancelSellHouse = async (houseID: number) => {
    // 取消房子的出单
    if (account === '') {
        alert('You have not connected wallet yet.')
        return
    }
    if (buymyroomContract) {
    	try {
    	// 切换房子的出售状态为不出售
    		await buymyroomContract.methods.changeHouseState(houseID).send({
    		from: account
    	})
    	await getHouses()
    	alert('You have cancelled the sale of the house')
    	} catch (error: any) {
    		alert(error.message)
    	}
    } else {
    	alert('contract doesn\'t exist')
    }
}
```

3. 用户查看所有出售中的房产及相关信息

查看出售中的房产及相关信息和用户查看当前的资产类似，前端通过调用后端的`getHouses`函数获取房屋列表，通过过滤掉状态为`未出售`的房子即可。

```react
<div className="houses-container">
    {houses
        .filter((house: House) => house.isListed)
        .map((house: House) => (
        <HouseCardForSell key={house.houseID} house={house}/>
    ))}
</div>
```

4. 用户以测试以太币购买对应的房屋，同时平台收取手续费

后端：

`buyHouseInEther`函数声明为`payable`，表示用户可以进行支付操作。

首先进行基本的逻辑判断，例如房子主人不能进行购买。调用`calcutelateFeeInEther`函数计算平台方小费（和时间戳、房屋出价相关），计算出售方最终所得，使用`address.call{value: ...}("")`进行支付。最后需要改变房子的拥有权，一是需要调用ERC721合约的相关函数进行NFT房屋资产的转义，二是需要修改房屋结构体的具体信息（拥有者，价格），同时将房屋从挂单中撤回

```solidity
// 计算手续费 Ether
function calculateFeeInEther(uint256 houseID) view public returns(uint256){
        return (houses[houseID].price * feePercentage + (block.timestamp - houses[houseID].listedTimestamp)) / 100;
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
```

前端：

在出售的房屋中存在购买的相关按钮，用户通过点击按钮进行购买，通过调用合约中的`butHouseInEther`函数进行支付，需要关注的是由于调用的是payable类型的函数，需要添加value字段表示用户愿意支付的金额，需要使用房屋的出售价格作为value，最后支付后房屋所有权和状态改变，需要重新获取房屋列表：

```react
const buyHouseInEther = async (houseID: number) => {
    if (account === '') {
        alert('You have not connected wallet yet.')
        return
    }
    const house_:House = houses[houseID]
    if (buymyroomContract) {
        try {
            // 注意：用于调用的是payable函数，需要添加value字段表示支付的eth数量
            // 注意单位的转化，需要将eth转为wei
            await buymyroomContract.methods.buyHouseInEther(houseID).send({
                from: account,
                value: String(BigInt(house_.price) * BigInt(10**18))
            })
            // 重新渲染房屋列表
            await getHouses()
            alert('Buy house successfully')
        } catch (error: any) {
            alert(error.message)
        }
    } else {
        alert('contract doesn\'t exist')
    }
}
```

5. Bonus：发行ERC20合约，允许用户将测试以太币兑换成ERC20积分，并以ERC20积分购买房屋

后端：

ERC20合约允许用户使用ERC20积分作为房屋的支付手段，我们需要提供以太币和ERC20积分转换的入口函数`changeEth2Erc20`

```solidity
// 转换以太币为erc20
function changeEth2Erc20() payable public {
    //将msg.value对应的eth转化为erc20积分
    uint256 erc20 = msg.value * ethToErc20;
    myERC20.sendErc20(msg.sender, erc20);
    //相当于将对应的eth转给平台方
    (bool success, ) = manager.call{value: msg.value}("");
    require(success, "Transaction failed for manager");
}
```

需要定义`MyERC20`合约的相关逻辑，分配给用户ERC20积分：

```solidity
// MyERC20.sol
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    // 分配ERC20积分给地址customer
    function sendErc20(address customer, uint256 amount) external{
        _mint(customer, amount);
    }
}

```

当用户选择使用ERC20积分购买房子的时候，需要使用myERC20合约对象的相关函数，逻辑类似于以太币购买，区别在于不需要使用payable修饰符，因为可以使用myERC20的委托转账机制。最后同以太币购买一样，需要改变房子的拥有权，并从挂单中撤回。

```solidity
// 计算手续费 Erc20
function calculateFeeInErc20(uint256 houseID) view public returns(uint256){
	return (houses[houseID].erc20Price * feePercentage + (block.timestamp - houses[houseID].listedTimestamp)) / 100;
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
```



前端：

首先提供转换ERC20积分的入口按钮，然后用户输入以太币数量，最终兑换成ERC20积分，默认`1 eth = 2 erc20 token`

主要调用的就是后端转换以太币的函数，还是需要注意单位的转化：

```react
const changeEth2Erc20 = async (price:number) => {
        // 传入以太币数量
    if (account === '') {
        alert('You have not connected wallet yet.')
        return
    }
    if (buymyroomContract && myERC20Contract) {
        try {
            await buymyroomContract.methods.changeEth2Erc20().send({
                from: account,
                value: String(BigInt(price) * BigInt(10**18))
            })
            await getHouses()
            alert('Successfully changed ' + price + ' eth to ZJUToken')
            } catch (error: any) {
                alert(error.message)
            }
        } else {
            alert('contract doesn\'t exist')
        }
}
```

同时提供用户一个可以使用erc20积分购买房子的按钮，用户点击后调用智能合约中的`buyHouseInErc20`函数进行支付，需要关注的是，类似于ERC721合约，NFT在进行资产转移的时候需要认证，ERC20积分在转移之前也需要进行approve的认证，即允许用户最多投入的Erc20积分，之后平台可以使用这些积分完成委托转账。

```react
const buyHouseErc20 = async (houseID: number) => {
    if (account === '') {
        alert('You have not connected wallet yet.')
        return
    }
    const house_:House = houses[houseID]
    if (buymyroomContract && myERC20Contract) {
        try {
            //需要首先进行认证，允许用户最多投入xxErc20代币
            await myERC20Contract.methods.approve(buymyroomContract.options.address, house_.erc20Price*10**18).send({
                from: account
            })
            await buymyroomContract.methods.buyHouseInErc20(houseID).send({
                from: account
            })
            // 重新渲染房子列表
            await getHouses()
            alert('Buy house successfully')
        } catch (error: any) {
            alert(error.message)
        }
    } else {
        alert('contract doesn\'t exist')
    }
}
```

6. 其他关于显示当前账户地址、当前账户以太币余额、Erc20余额都是较为简单的，借鉴于课程Demo，主要利用前端web3实现，这里不再赘述。

## 项目运行截图

1. 查看当前用户下的资产和出售中的房屋（页面较长，分为两页）

<img src="assets/image-20241019092753005.png" alt="image-20241019092753005" style="zoom:67%;" />

<img src="assets/image-20241019092810046.png" alt="image-20241019092810046" style="zoom:67%;" />

2. 当前用户出售House 0，同时将价格设置为5 eth

- 点击House 0的出单按钮，弹出对话框，输入eth价格

  <img src="assets/image-20241019092949153.png" alt="image-20241019092949153" style="zoom:67%;" />

  <img src="assets/image-20241019093008190.png" alt="image-20241019093008190" style="zoom:67%;" />

- 点击确定按钮后弹出MetaMask的相关提示

首先是ERC721的资产转移权限确认，是否允许第三方访问你的资产，点击确认

<img src="assets/image-20241019093058512.png" alt="image-20241019093058512" style="zoom:67%;" />

然后是改变房屋出售状态的函数调用产生的燃料费确定，点击确定：

<img src="assets/image-20241019093223288.png" alt="image-20241019093223288" style="zoom:67%;" />

最后是房屋价格改变的燃料费确定，点击确定

<img src="assets/image-20241019093308603.png" alt="image-20241019093308603" style="zoom:67%;" />

最后页面如下：

<img src="assets/image-20241019093352148.png" alt="image-20241019093352148" style="zoom:67%;" />

同时挂单房屋中也有变化：

<img src="assets/image-20241019093426393.png" alt="image-20241019093426393" style="zoom:67%;" />

由前面我们知道一共产生了三次交易，发起者都是`0x8bb...`，查看ganache上的交易，发现符合。

<img src="assets/image-20241019093558064.png" alt="image-20241019093558064" style="zoom:67%;" />

3. 当前用户使用以太币购买出售中的House 1

点击待出售房子中的House 1下的以太币购买按钮：

<img src="assets/image-20241019093854033.png" alt="image-20241019093854033" style="zoom:67%;" />

弹出Metamask的支付页面，包括金额和燃料费：

<img src="assets/image-20241019093953391.png" alt="image-20241019093953391" style="zoom:67%;" />

点击确定后执行完成交易，再次查看页面：

<img src="assets/image-20241019094039532.png" alt="image-20241019094039532" style="zoom:67%;" />

<img src="assets/image-20241019094048820.png" alt="image-20241019094048820" style="zoom:67%;" />

发现房屋资产已经改变。

我们来查看一下eth余额的变化：

<img src="assets/image-20241019093811482.png" alt="image-20241019093811482" style="zoom:67%;" />

<img src="assets/image-20241019094122764.png" alt="image-20241019094122764" style="zoom:67%;" />

可以看到当前用户支付了10eth，余额减10，平台收取1eth，最终出售方获取了9eth

4. 切换用户，使用ERC20积分购买房子

切换用户需要手动点击插件Metamask，选择Account 4后刷新页面

<img src="assets/image-20241019094410662.png" alt="image-20241019094410662" style="zoom:67%;" />

查看当前房屋资产，发现已经做出改变

<img src="assets/image-20241019094441273.png" alt="image-20241019094441273" style="zoom:67%;" />

首先点击兑换ERC20（ZJUToken）的按钮，输入20eth：

<img src="assets/image-20241019094530223.png" alt="image-20241019094530223" style="zoom:67%;" />

Metamask弹出支付提示，点击确认：

<img src="assets/image-20241019094553387.png" alt="image-20241019094553387" style="zoom:67%;" />

可以发现当前以太币和ZJUToken数量都发生了改变：

<img src="assets/image-20241019094636475.png" alt="image-20241019094636475" style="zoom:67%;" />

在出售房屋中选择使用ZJUToken购买：

<img src="assets/image-20241019094707091.png" alt="image-20241019094707091" style="zoom:67%;" />

弹出Metamask的ERC20支付上限批准：

<img src="assets/image-20241019094742455.png" alt="image-20241019094742455" style="zoom:67%;" />

点击下一步，批准后，弹出调用使用ERC20购买的函数需要的燃料费支付提示，点击确认

<img src="assets/image-20241019094843461.png" alt="image-20241019094843461" style="zoom:67%;" />

房子购买成功，查看当前页面：

可以看到ZJUToken-10，同时购买了House 2房子。

<img src="assets/image-20241019094919628.png" alt="image-20241019094919628" style="zoom:67%;" />

原先的其余账户ZJUToken都为0，我们切换到平台方，发现已经收取了10%左右的手续费：

<img src="assets/image-20241019095028648.png" alt="image-20241019095028648" style="zoom:67%;" />

切换到出售方，发现资产中已经没有House 2，同时多了9 ZJUToken，即交易成功：

<img src="assets/image-20241019095123328.png" alt="image-20241019095123328" style="zoom:67%;" />



## 参考内容

- 课程的参考Demo见：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)。

- 快速实现 ERC721 和 ERC20：[模版](https://wizard.openzeppelin.com/#erc20)。记得安装相关依赖 ``"@openzeppelin/contracts": "^5.0.0"``。

- 如何实现ETH和ERC20的兑换？ [参考讲解](https://www.wtf.academy/en/docs/solidity-103/DEX/)

- Kimi 智能助手（AI）

- Solidity基础https://cn.leapwhale.com/zh/article/8r581039
