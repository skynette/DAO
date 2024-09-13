import { FC } from "react";
import useCanvasWallet from "./CanvasWalletProvider";
import UserProfile from "./UserProfile"; // Ensure the correct path to UserProfile
import Main1 from "./Main1"; // Import Main1 component

const WalletComponent = () => {
  const { connectWallet, walletAddress, walletIcon, userInfo, content, signTransaction ,} =
    useCanvasWallet();

   
  return (
    <div>
      {
        !walletAddress && (<>
          <h1 className="text-purple-500">Welcome to CanvasStrawPoll</h1>
          <button onClick={connectWallet} style={{backgroundColor:"#6366F1", marginTop: "-10px"}}>Connect Solana Wallet</button>
          </> )
      }

      {userInfo && walletAddress && (
        <div>
          {userInfo.username && <UserProfile username={userInfo.username} walletAddress={walletAddress||"N/A"}  avatar={userInfo.avatar}/>}
        </div>
      )}


      {walletAddress &&  (
        <Main1 walletAddress={walletAddress} />
      )}
    </div>
  );
};

export default WalletComponent;
