import { FC } from "react";
import Main1 from "./Main1";
import UserProfile from "./UserProfile";
import useCanvasWallet from "./CanvasWalletProvider";

const WalletComponent = () => {
  const { connectWallet, walletAddress, walletIcon, userInfo, content, signTransaction ,} =
    useCanvasWallet();

   
  return (
    <div>
      {
        !walletAddress && (<>
          <button onClick={connectWallet} style={{backgroundColor:"#6366F1", marginTop: "-10px"}}>Connect Solana Wallet</button>
          </> )
      }

      {userInfo && walletAddress && (
        <div>
          {userInfo.username && <UserProfile username={userInfo.username} walletAddress={walletAddress||"Connect"}  avatar={userInfo.avatar}/>}
        </div>
      )}


      {walletAddress &&  (
        <Main1 walletAddress={walletAddress} />
      )}
    </div>
  );
};

export default WalletComponent;
