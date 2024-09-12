import React, { useState, useEffect } from "react";
import idl from "./idl.json";
import {
  PublicKey,
  clusterApiUrl,
  Connection,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { toast } from "react-toastify";
import { Buffer } from "buffer";
import Modal from "react-modal";
import useCanvasWallet from "./CanvasWalletProvider";
import { encode } from "bs58";

window.Buffer = Buffer;

const Main1 = ({ walletAddress }) => {
  const [campaigns, setCampaigns] = useState();
  const [activeTab, setActiveTab] = useState("myCampaigns");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isDonateModalOpen, setDonateModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isConfirmModalOpen, setisConfirmModalOpen] = useState(false);
  const [callFun, setCallFun] = useState("");
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "" });
  const [donationAmount, setDonationAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCreatedCampaign, setIsCreatedCampaign] = useState(false);
  const programId = new PublicKey(idl.address);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const SOLANA_MAINNET_CHAIN_ID = "solana:101";
  const { canvasClient } = useCanvasWallet();

  const signTransaction = async (transaction) => {
    if (!canvasClient || !walletAddress) {
      console.error("CanvasClient or walletAddress is not available");
      return null;
    }

    try {
      const network =
        process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com/";
      const connection = new Connection(network, "confirmed");

      // Fetch the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash({
        commitment: "finalized",
      });
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(walletAddress);

      // Serialize the transaction
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const base58Tx = encode(serializedTx);
      setNewCampaign({ name: "", description: "" });
      setDonationAmount(0);
      setWithdrawAmount(0);

      // Sign and send the transaction via canvasClient
      const results = await canvasClient.signAndSendTransaction({
        unsignedTx: base58Tx,
        awaitCommitment: "confirmed",
        chainId: SOLANA_MAINNET_CHAIN_ID,
      });

      if (results?.untrusted?.success) {
        toast.success("transaction signed");
        getCampaigns();
        console.log("Transaction signed:", results);
        return results;
      } else {
        toast.error("Failed to sign transaction");
        console.error("Failed to sign transaction");
      }
    } catch (error) {
      toast.error("Failed to sign transaction");
      console.error("Error signing transaction:", error);
    }
    return null;
  };

  const customStyles = {
    content: {
      position: "absolute",
      inset: "12% 40px 40px 5%",
      border: "none",
      backgroundColor: "rgb(30, 41, 59)",
      overflow: "auto",
      borderRadius: "8px",
      outline: "none",
      padding: "20px",
      color: "rgb(255, 255, 255)",
      width: "400px",
      margin: "auto",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
  };

  useEffect(() => {
    if (walletAddress) {
      getCampaigns();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (
      campaigns &&
      campaigns.some((campaign) => campaign.admin.toString() === walletAddress)
    ) {
      setIsCreatedCampaign(true);
    }
  }, [campaigns, walletAddress]);

  const getCampaigns = async () => {
    if (!walletAddress) {
      toast.info("Wallet not connected.");
      return;
    }
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const campaignAccounts = await connection.getProgramAccounts(programId);
    const fetchedCampaigns = await Promise.all(
      campaignAccounts.map(async (campaign) => ({
        ...(await program.account.campaign.fetch(campaign.pubkey)),
        pubkey: campaign.pubkey,
      }))
    );

    setCampaigns(fetchedCampaigns);
  };

  const createCampaign = async () => {
    if (!walletAddress) {
      setNewCampaign({ name: "", description: "" });
      toast.info("Connect your wallet first");
      return;
    }
    if (!newCampaign.name || !newCampaign.description) {
      setNewCampaign({ name: "", description: "" });
      toast.info("Invalid input.");
      return;
    }

    if (isCreatedCampaign) {
      setNewCampaign({ name: "", description: "" });
      toast.error("Can not create more than one campaign");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );

    const program = new Program(idl, provider);

    const [campaign] = PublicKey.findProgramAddressSync(
      [Buffer.from("CAMPAIGN_DEMO"), new PublicKey(walletAddress).toBuffer()],
      program.programId
    );

    const res = await program.methods
      .create(newCampaign.name, newCampaign.description)
      .accounts({
        campaign,
        user: new PublicKey(walletAddress),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    if (res) {
      console.log("Created a new campaign w/ address:", campaign.toString());
      toast("Created a new campaign");
    }
  };

  const donate = async () => {
    if (!walletAddress) {
      setDonationAmount(0);
      toast.info("Connect your wallet first");
      return;
    }
    if (!selectedCampaign || donationAmount < 0.02) {
      setDonationAmount(0);
      toast.info("Donation amount should be greater than 0.02 SOL.");
      console.error("Invalid donation amount.");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const res = await program.methods
      .donate(new BN(donationAmount * 1e9)) // Convert SOL to lamports (1 SOL = 1e9 lamports)
      .accounts({
        campaign: selectedCampaign,
        user: new PublicKey(walletAddress),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    if (res) {
      console.log(
        "Donated:",
        donationAmount,
        "to:",
        selectedCampaign.toString()
      );
      toast.success(
        "Donated:",
        donationAmount,
        "to:",
        selectedCampaign.toString()
      );
    } else {
      console.log(res);
    }
  };

  const withdraw = async () => {
    if (!walletAddress) {
      setWithdrawAmount(0);
      toast.info("Connect your wallet first");
      return;
    }
    if (!selectedCampaign || withdrawAmount < 0.02) {
      setWithdrawAmount(0);
      toast.info("Withdrawal amount should be greater than 0.02 SOL.");
      return;
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: new PublicKey(walletAddress),
        signTransaction,
      },
      {
        commitment: "confirmed",
      }
    );
    const program = new Program(idl, provider);

    const res = await program.methods
      .withdraw(new BN(withdrawAmount * 1e9)) // Convert SOL to lamports (1 SOL = 1e9 lamports)
      .accounts({
        campaign: selectedCampaign,
        user: new PublicKey(walletAddress),
      })
      .rpc();

    if (res) {
      console.log(
        "Withdrew:",
        withdrawAmount,
        "from:",
        selectedCampaign.toString()
      );
      toast.success(
        "Withdrew:",
        withdrawAmount,
        "from:",
        selectedCampaign.toString()
      );
    } else {
      console.log(res);
    }
  };

  const handleConfirm = () => {
    setSelectedCampaign(null);
    if (callFun === "campaign") {
      setCreateModalOpen(false);
      createCampaign();
    } else if (callFun === "donate") {
      setDonateModalOpen(false);
      donate();
    } else if (callFun === "withdraw") {
      setWithdrawModalOpen(false);
      withdraw();
    }
    setisConfirmModalOpen(false);
  };

  const renderCampaigns = (isOwnCampaigns) => (
    <div className="flex flex-col items-center">
      {isOwnCampaigns && (
        <div className="w-full max-w-3xl text-center mb-4 text-white">
          <p className="text-gray-400">
            Note: You can only create a campaign once per account.
          </p>
        </div>
      )}
      {!campaigns && (
        <div className="flex justify-center w-full h-full items-center">
          <div
            className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"
            role="status"
          ></div>
          <span className="ml-2 text-lg">Loading...</span>
        </div>
      )}
      {campaigns && campaigns.length > 0 ? (
        campaigns
          .filter((campaign) => {
            return isOwnCampaigns
              ? campaign.admin.toString() === walletAddress
              : campaign.admin.toString() !== walletAddress;
          })
          .map((campaign) => (
            <div
              key={campaign.pubkey.toString()}
              className="w-full max-w-3xl border border-gray-600 rounded-lg p-4 my-4 shadow-md bg-gray-800 relative overflow-hidden"
            >
              <div className="flex flex-col mb-12 text-left">
                <h3 className="m-0 mb-2 text-cyan-400">{campaign.name}</h3>
                <p className="my-1 text-gray-300">
                  <strong>Description:</strong> {campaign.description}
                </p>
                <p className="my-1 text-gray-300">
                  <strong>Balance:</strong>{" "}
                  {(campaign.amountDonated / 1e9).toFixed(2)} SOL
                </p>
                <p className="my-1 text-gray-300">
                  <strong>Admin:</strong> {campaign.admin.toString()}
                </p>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={() => {
                    setDonateModalOpen(true);
                    setSelectedCampaign(campaign.pubkey);
                  }}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                >
                  Donate
                </button>
                {campaign.admin.toString() === walletAddress && (
                  <button
                    onClick={() => {
                      if (
                        (campaign.amountDonated / 1e9).toFixed(2) <
                        withdrawAmount
                      ) {
                        toast.error("Cannot withdraw from campaign.");
                        return;
                      }
                      setWithdrawModalOpen(true);
                      setSelectedCampaign(campaign.pubkey);
                    }}
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))
      ) : (
        <div className="w-full max-w-3xl text-center text-white">
          <p>No campaigns created by others.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4">
      {walletAddress ? (
        <div>
          <div className="flex justify-center mb-4 gap-4">
            <button
              onClick={() => {
                setActiveTab("myCampaigns");
                getCampaigns();
              }}
              className={`px-6 py-3 w-1/2 border-2 ${activeTab === "myCampaigns"
                  ? "border-cyan-400 bg-gray-800 text-cyan-400 font-bold"
                  : "border-gray-800 bg-gray-700 text-white"
                } cursor-pointer transition-all duration-300`}
            >
              My Campaigns
            </button>
            <button
              onClick={() => {
                setActiveTab("otherCampaigns");
                getCampaigns();
              }}
              className={`px-6 py-3 w-1/2 border-2 ${activeTab === "otherCampaigns"
                  ? "border-cyan-400 bg-gray-800 text-cyan-400 font-bold"
                  : "border-gray-800 bg-gray-700 text-white"
                } cursor-pointer transition-all duration-300`}
            >
              Other Campaigns
            </button>
          </div>
          {activeTab === "myCampaigns" && (
            <div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 w-full bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors shadow-md mb-6 mt-3"
              >
                Create Campaign +
              </button>
              {renderCampaigns(true)}
            </div>
          )}
          {activeTab === "otherCampaigns" && renderCampaigns(false)}
        </div>
      ) : (
        <></>
      )}

      {/* Modals */}
      <Modal
        className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        isOpen={isCreateModalOpen}
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Create Campaign</h2>
          <form className="w-full">
            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="campaignName">
                Campaign Name:
              </label>
              <input
                id="campaignName"
                type="text"
                value={newCampaign.name}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, name: e.target.value })
                }
                className="w-full bg-gray-800 text-white rounded p-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="campaignDescription">
                Campaign Description:
              </label>
              <textarea
                id="campaignDescription"
                value={newCampaign.description}
                onChange={(e) =>
                  setNewCampaign({
                    ...newCampaign,
                    description: e.target.value,
                  })
                }
                className="w-full bg-gray-800 text-white rounded p-2 min-h-[60px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                onClick={() => {
                  setCallFun("campaign");
                  setisConfirmModalOpen(true);
                }}
              >
                Create
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Donate Modal */}
      <Modal
        className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        isOpen={isDonateModalOpen}
        onRequestClose={() => setDonateModalOpen(false)}
      >
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Donate to Campaign</h2>
          <form className="w-full">
            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="donationAmount">
                Donation Amount (Minimum 0.02 SOL):
              </label>
              <input
                id="donationAmount"
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(Number(e.target.value))}
                min="0"
                className="w-full bg-gray-800 text-white rounded p-2"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                onClick={() => {
                  setCallFun("donate");
                  setisConfirmModalOpen(true);
                }}
              >
                Donate
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={() => setDonateModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        isOpen={isWithdrawModalOpen}
        onRequestClose={() => setWithdrawModalOpen(false)}
      >
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-4">Withdraw from Campaign</h2>
          <form className="w-full">
            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="withdrawalAmount">
                Withdrawal Amount (Minimum 0.02 SOL):
              </label>
              <input
                id="withdrawalAmount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                min="0"
                className="w-full bg-gray-800 text-white rounded p-2"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                onClick={() => {
                  setCallFun("withdraw");
                  setisConfirmModalOpen(true);
                }}
              >
                Withdraw
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                onClick={() => setWithdrawModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        className="bg-gray-900 p-6 rounded-lg max-w-md mx-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
        isOpen={isConfirmModalOpen}
        onRequestClose={() => setisConfirmModalOpen(false)}
      >
        <div className="flex flex-col items-center">
          <p className="bg-gray-800 p-3 rounded text-orange-400 text-lg mb-4">
            Before making this transaction make sure you have enough balance in
            your wallet!!
          </p>
          <div className="flex flex-col gap-2 w-full">
            <button
              type="button"
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
              onClick={handleConfirm}
            >
              Confirm
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              onClick={() => setisConfirmModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Main1;