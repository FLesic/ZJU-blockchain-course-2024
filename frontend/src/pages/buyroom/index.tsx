import {Button, Divider, Image, Input, Modal} from 'antd';
import {Header} from "../../asset";
import {UserOutlined} from "@ant-design/icons";
import {SetStateAction, useEffect, useState} from 'react';
import {buymyroomContract, myERC20Contract, myERC721Contract, web3} from "../../utils/contracts";
import './index.css';

const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
// TODO change according to your configuration
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

// 定义一个 TypeScript 接口来描述房屋对象的结构
interface House {
    houseID: number;
    owner: string;
    isListed: boolean;
    price: number; // 传进来是10**18以wei为单位
    erc20Price: number;
    listedTimestamp: number;
    ethPrice: number;
}

interface HouseCardProps {
    house: House;
}

const BuyMyRoomPage = () => {
    const [account, setAccount] = useState('')
    const [manager, setManagerAccount] = useState('')
    const [accountBalanceInEther, setAccountBalanceInEther] = useState(0)
    const [accountBalanceInErc20, setAccountBalanceInErc20] = useState(0)
    const [houses, setHouses] = useState([])
    useEffect(() => {
        // 初始化检查用户是否已经连接钱包
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        const initCheckAccounts = async () => {
            // @ts-ignore
            const {ethereum} = window;
            if (Boolean(ethereum && ethereum.isMetaMask)) {
                // 尝试获取连接的用户账户(即当前账户)
                const accounts = await web3.eth.getAccounts()
                if (accounts && accounts.length) {
                    setAccount(accounts[0].toLowerCase())
                    const balanceEther = await web3.eth.getBalance(accounts[0])
                    setAccountBalanceInEther(Number(balanceEther)/(10**18)) // 设置用户的以太币数量
                }
            }
        }

        initCheckAccounts()
    }, [])
    useEffect(() => {
        // 设置部署者地址以及房屋列表信息
        const getBuyMyRoomContractInfo = async () => {
            if (buymyroomContract) {
                const ma = await buymyroomContract.methods.manager().call()
                // @ts-ignore
                setManagerAccount(ma)
                await getHouses()
            } else {
                alert('Contract not exists.')
            }
        }
        getBuyMyRoomContractInfo()
    }, [])
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
        const updateBalance = async () => {
            // @ts-ignore
            const {ethereum} = window;
            if (Boolean(ethereum && ethereum.isMetaMask)) {
                // 尝试获取连接的用户账户(即当前账户)
                const accounts = await web3.eth.getAccounts()
                if (accounts && accounts.length) {
                    setAccount(accounts[0].toLowerCase())
                    const balanceEther = await web3.eth.getBalance(accounts[0])
                    setAccountBalanceInEther(Number(balanceEther)/(10**18)) // 设置用户的以太币数量
                }
                if (myERC20Contract) {
                    const ab = await myERC20Contract.methods.balanceOf(accounts[0]).call()
                    setAccountBalanceInErc20(Number(ab)/(10**18))
                } else {
                    alert('Contract not exists.')
                }
            }
        }
        updateBalance()
    }
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
    // 连接钱包
    const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        // @ts-ignore
        const {ethereum} = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            alert('MetaMask is not installed!');
            return
        }

        try {
            // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
            if (ethereum.chainId !== GanacheTestChainId) {
                const chain = {
                    chainId: GanacheTestChainId, // Chain-ID
                    chainName: GanacheTestChainName, // Chain-Name
                    rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到Metamask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({
                            method: 'wallet_addEthereumChain', params: [chain]
                        });
                    }
                }
            }

            // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
            await ethereum.request({method: 'eth_requestAccounts'});
            // 获取小狐狸拿到的授权用户列表
            const accounts = await ethereum.request({method: 'eth_accounts'});
            // 如果用户存在，展示其account，否则显示错误信息
            setAccount(accounts[0] || 'Not able to get accounts');
        } catch (error: any) {
            alert(error.message)
        }
    }
    // 待出售房屋信息卡片
    // @ts-ignore
    function HouseCardForSell({house}: HouseCardProps) {
        return (
            <div className="house-card">
                <h3>House {house.houseID}</h3>
                <p>拥有者: {house.owner}</p>
                <p>以太币价格: {house.isListed ? house.price : null} eth</p>
                <p>{house.isListed ? "ZJUToken价格:" + house.erc20Price : null} </p>
                <p>状态: {house.isListed ? '出售中' : '未出售'}</p>
                <p>Timestamp: {new Date(house.listedTimestamp * 1000).toLocaleString()}</p>
                <div>
                    <Button type="primary" onClick={() => buyHouseInEther(house.houseID)}>以太币购买</Button>
                </div>
                <div style={{height:'10px'}}></div>
                <div>
                    <Button type="primary" onClick={() => buyHouseErc20(house.houseID)}>ZJUToken购买</Button>
                </div>

            </div>
        );
    }

    // 本地资产房屋信息卡片
    // @ts-ignore
    function HouseCardLocal({house}: HouseCardProps) {
        const [isDialogOpen, setIsDialogOpen] = useState(false);
        const [userInput, setUserInput] = useState(0);
        const handleButtonClick = () => {
            setIsDialogOpen(true); // 打开对话框
        };
        const handleCloseDialog = () => {
            setIsDialogOpen(false); // 关闭对话框
        };
        const handleInputChange = (event: any) => {
            setUserInput(event.target.value); // 更新用户输入的状态
        };
        const handleConfirmDialog1 = (houseID:number, price:number) => {
            sellHouse(houseID, price);
            setIsDialogOpen(false); // 关闭对话框
        };
        const handleConfirmDialog2 = (houseID:number) => {
            cancelSellHouse(houseID);
            setIsDialogOpen(false); // 关闭对话框
        };
        return (
            <div className="house-card">
                <h3>House {house.houseID}</h3>
                <p>拥有者: {house.owner}</p>
                <p>{house.isListed ? "以太币价格:" + house.price + "eth" : null} </p>
                <p>{house.isListed ? "ZJUToken价格:" + house.erc20Price : null} </p>
                <p>状态: {house.isListed ? '出售中' : '未出售'}</p>
                <Button type="primary" onClick={() => handleButtonClick()}>{house.isListed ? '取消出单' : '出单'}</Button>

                <Modal title="请输入您的出价(单位eth)：" open={isDialogOpen && !house.isListed}
                       onOk={() => handleConfirmDialog1(house.houseID, userInput)} onCancel={handleCloseDialog}>
                    <Input type="number" value={userInput} onChange={handleInputChange}/>
                </Modal>

                <Modal title="确认停止销售当前房子？" open={isDialogOpen && house.isListed}
                       onOk={() => handleConfirmDialog2(house.houseID)} onCancel={handleCloseDialog}>
                </Modal>
            </div>
        );
    }
    function ButtonForConver(){
        const [isDialogOpen, setIsDialogOpen] = useState(false);
        const [userInput, setUserInput] = useState(0);
        const handleButtonClick = () => {
            setIsDialogOpen(true); // 打开对话框
        };
        const handleCloseDialog = () => {
            setIsDialogOpen(false); // 关闭对话框
        };
        const handleInputChange = (event: any) => {
            setUserInput(event.target.value); // 更新用户输入的状态
        };
        const handleConfirmDialog = (price:number) => {
            changeEth2Erc20(price);
            setIsDialogOpen(false); // 关闭对话框
        };
        return(
            <div>
                {account != '' && <Button onClick={handleButtonClick}>兑换ZJUToken(1 eth = 2 ZJUToken)</Button>}
                <Modal title="请输入兑换的eth数量：" open={isDialogOpen} onOk={()=>handleConfirmDialog(userInput)} onCancel={handleCloseDialog}>
                    <div>
                        <Input type="number" value={userInput} onChange={handleInputChange}/>
                    </div>
                </Modal>
            </div>
        )
    }

    return (
        <div>
            <Image
                width='100%'
                height='180px'
                preview={false}
                src={Header}
            />
            <Divider style={{borderColor: '#7cb305'}}>
                <h2> 本地资产 {account === '' && <Button onClick={onClickConnectWallet}>连接钱包</Button>}</h2>
            </Divider>

            <div>当前用户：{account === '' ? '无用户连接' : account},
                拥有以太币数量：{account === '' ? 0 : accountBalanceInEther.toFixed(2)}eth,
                拥有ZJUToken数量：{account === '' ? 0 : accountBalanceInErc20}
            </div>
            <div>
                <ButtonForConver/>
            </div>
            <div className="houses-container">
                {houses
                    .filter((house: House) => house.owner === account)
                    .map((house: House) => (
                        <HouseCardLocal key={house.houseID} house={house}/>
                    ))}
            </div>
            <Divider style={{borderColor: '#7cb305'}}><h2> 待出售的房子 </h2></Divider>

            <div>平台地址：{manager.toLowerCase()}</div>

            <div className="houses-container">
                {houses
                    .filter((house: House) => house.isListed)
                    .map((house: House) => (
                        <HouseCardForSell key={house.houseID} house={house}/>
                    ))}
            </div>

        </div>
    )
}

export default BuyMyRoomPage