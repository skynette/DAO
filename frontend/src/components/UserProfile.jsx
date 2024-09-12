import React, { useEffect, useState } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import dscvr_logo from "/dscvr_logo.svg"

// Initialize the GraphQL client with the DSCVR endpoint
const client = new GraphQLClient('https://api.dscvr.one/graphql');

// Define the GraphQL query for fetching user data by username
const GET_USER_DATA = gql`
  query GetUserData($username: String!) {
    userByName(name: $username) {
      id
      followingCount
      followerCount
      dscvrPoints
    }
  }
`;

const UserProfile = ({ username, walletAddress, avatar }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async (username) => {
    try {
      setLoading(true);
      const data = await client.request(GET_USER_DATA, { username });
      setUserData(data.userByName);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch user data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData(username);
  }, [username]);

  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '';
  };

  const shortenWalletAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) return (
    <div className="flex justify-center items-center w-full h-full">
      <div className='spinner-border' role='status'></div>
      <span className="ml-2 text-lg">Loading...</span>
    </div>
  );
  if (error) return <div>{error}</div>;

  return userData ? (
    <div className="flex border border-gray-600 rounded-xl p-4 max-w-[450px] min-w-[70vw] mx-auto mb-5 bg-gray-900 text-white shadow-lg justify-evenly">
      <div className="flex items-center mr-5">
        {avatar ? (
          <img
            src={avatar}
            alt={`${username}'s avatar`}
            className="h-3/5 rounded-full aspect-square object-cover border-2 border-cyan-400"
          />
        ) : (
          <div className="p-8 flex w-14 items-center justify-center bg-gray-900 text-white rounded-full border-2 border-cyan-300 text-3xl">
            {getInitials(username)}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center text-left">
        <p className="text-lg font-bold mb-2">{username}</p>
        <p className="text-sm mb-1 flex">
          <strong className="text-cyan-400 mr-0.5">{userData.followerCount}</strong> Followers &nbsp;&nbsp;
          <strong className="text-cyan-400 mr-0.5">{userData.followingCount}</strong> Following
        </p>
        <p className="text-sm mb-1 flex items-center">
          <img src={dscvr_logo} alt="DSCVR Points Icon" className="w-8 mr-2" />
          {userData.dscvrPoints / 1e6}
        </p>
        <p className="text-sm mt-2 text-gray-300">
          Wallet Address: <span className="cursor-pointer border-b border-dotted border-gray-300" title={walletAddress}>{shortenWalletAddress(walletAddress)}</span>
        </p>
      </div>
    </div>
  ) : (
    <div>No user data found</div>
  );
};

export default UserProfile;