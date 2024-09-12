import { FC } from "react";
import useCanvasWallet from "../Provider/CanvasWalletProvider";
import UserProfile from "./UserProfile"; // Ensure the correct path to UserProfile
import Campaigns from "./Cmapaigns"; // Import Campaigns component

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
          {userInfo.username && <UserProfile username={userInfo.username} walletAddress={walletAddress||"N/A"}  avatar={userInfo.avatar}/>}
        </div>
      )}


      {walletAddress &&  (
        <Campaigns walletAddress={walletAddress} />
      )}
    </div>
  );
};

export default WalletComponent;
