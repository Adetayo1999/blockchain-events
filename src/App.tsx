import { useState, useEffect, useCallback } from "react";
import { BigNumber, Contract, providers, utils } from "ethers";
import Web3modal from "web3modal";
import { abi, punks } from "./consts";

const zero = BigNumber.from(0);

type TransactionType = {
  sender: string;
  receiver: string;
  amount: string;
  etherscanURL: string;
};

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [punkBalance, setPunkBalance] = useState(zero);
  const [punkToSend, setPunkToSend] = useState(zero);
  const [addrToSend, setaddrToSend] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionType[]
  >([]);

  const getProvider = async () => {
    const web3modal = new Web3modal({
      network: "rinkeby",
      cacheProvider: true,
      providerOptions: {},
    });
    const provider = await web3modal.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) throw new Error("Rinkeby Network Only");
    return web3Provider;
  };

  const getUserPunkBalance = async (
    provider: providers.Web3Provider,
    addr: string
  ) => {
    try {
      const punkContract = new Contract(punks, abi, provider);
      const response: BigNumber = await punkContract.balanceOf(addr);
      // eslint-disable-next-line
      return response;
    } catch (error: any) {
      // eslint-disable-next-line
      console.error(error.message);
      return zero;
    }
  };

  const getDetails = useCallback(async () => {
    const provider = await getProvider();
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    const [ethBalance, punkResult] = await Promise.all([
      provider.getBalance(addr),
      getUserPunkBalance(provider, addr),
    ]);
    setAddress(addr);
    setBalance(utils.formatEther(ethBalance));
    setPunkBalance(punkResult);
  }, []);

  const handleTransfer = async () => {
    try {
      setTransferLoading(true);
      const signer = (await getProvider()).getSigner();
      const punkContract = new Contract(punks, abi, signer);
      const tx = await punkContract.transfer(addrToSend, punkToSend);
      await tx.wait();
      setTransferLoading(false);
      getDetails();
      setaddrToSend("");
    } catch (error: any) {
      // eslint-disable-next-line
      console.error(error.message);
      setTransferLoading(false);
    }
  };

  const connectWallet = useCallback(async () => {
    try {
      await getProvider();
      setWalletConnected(true);
    } catch (error: any) {
      // eslint-disable-next-line
      console.error(error.message);
    }
  }, []);

  useEffect(() => {
    if (!walletConnected) {
      connectWallet();
    }
  }, [walletConnected, connectWallet]);

  useEffect(() => {
    if (walletConnected) {
      getDetails();
    }
  }, [walletConnected, getDetails]);

  useEffect(() => {
    if (walletConnected) {
      (async () => {
        const provider = await getProvider();
        const punkContract = new Contract(punks, abi, provider);
        punkContract.on(
          "Transfer",
          (from: string, to: string, amount: BigNumber, event: any) => {
            // eslint-disable-next-line
            setRecentTransactions((prev) => [
              {
                sender: from,
                receiver: to,
                amount: utils.formatEther(amount),
                etherscanURL: `https://rinkeby.etherscan.io/tx/${event.transactionHash}`,
              },
              ...prev,
            ]);
            if (address === to) getDetails();
          }
        );

        return () => {
          punkContract.removeAllListeners();
        };
      })();
    }
  }, [walletConnected, getDetails, address]);

  useEffect(() => {
    // listening for account changes
    const handleAccountChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletConnected(false);
      } else {
        getDetails();
      }
    };
    window.ethereum.on("accountsChanged", handleAccountChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountChanged);
    };
  }, [getDetails]);

  return (
    <div className='min-h-screen bg-green-100 p-6'>
      <h1 className='mb-5 text-4xl font-semibold font-mono'>Lets Go 🚀</h1>
      <p>ADDRESS: {address}</p>
      <p>ETH BALANCE: {balance}</p>
      <p>PUNK BALANCE: {utils.formatEther(punkBalance)}</p>
      <div className='my-5 flex flex-col w-60'>
        <div className='flex flex-col md:flex-row items-center'>
          <input
            type='number'
            onChange={(e) => {
              setPunkToSend(utils.parseEther(e.target.value));
            }}
            name=''
            id=''
            placeholder='enter punk amount'
            className='w-full  rounded-sm mb-3 p-2  md:mr-5'
          />
          <input
            type='text'
            placeholder='enter address'
            value={addrToSend}
            onChange={(e) => setaddrToSend(e.target.value)}
            name=''
            id=''
            className='w-full  rounded-sm mb-3 p-2 md:mr-5'
          />
        </div>
        <button
          type='button'
          onClick={handleTransfer}
          className='w-full bg-teal-600 h-10 p-2 rounded-sm shadow text-gray-50'>
          Transfer
        </button>
        <div className='mt-3'>{transferLoading && <p>Loading</p>}</div>
      </div>
      <div className='mt-4'>
        {recentTransactions.length > 0 &&
          recentTransactions.map((transaction) => (
            <div
              className='text-gray-50 rounded bg-green-600 p-4 mb-3'
              key={transaction.etherscanURL}>
              <p> sender: {transaction.sender}</p>
              <p> Receiver: {transaction.receiver}</p>
              <p> Amount: {transaction.amount}CPT</p>
              <a
                href={transaction.etherscanURL}
                target='_blank'
                rel='noopener noreferrer'>
                View On Etherscan
              </a>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
