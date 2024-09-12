import React, { useEffect, useState } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import dscvr_logo from "/dscvr_logo.svg";

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
      <div className="spinner-border animate-spin" role="status"></div>
      <span className="ml-2 text-lg">Loading...</span>
    </div>
  );
  if (error) return <div>{error}</div>;

  return userData ? (
    <div className="flex flex-col sm:flex-row items-center sm:items-start border border-gray-600 rounded-lg p-4 max-w-lg sm:min-w-[70vw] mx-auto bg-[#1b1b2f] text-white shadow-lg mb-5">
      <div className="flex items-center justify-center sm:mr-5 mb-4 sm:mb-0">
        {avatar ? (
          <img
            src={avatar}
            alt={`${username}'s avatar`}
            className="rounded-full h-24 w-24 object-cover border-2 border-cyan-400"
          />
        ) : (
          <div className="flex items-center justify-center w-24 h-24 bg-gray-900 text-white rounded-full border-2 border-cyan-400 text-3xl">
            {getInitials(username)}
          </div>
        )}
      </div>
      <div className="text-left">
        <p className="text-lg font-bold mb-2">{username}</p>
        <p className="text-sm mb-2">
          <strong className="text-cyan-400">{userData.followerCount}</strong> Followers &nbsp;&nbsp;
          <strong className="text-cyan-400">{userData.followingCount}</strong> Following
        </p>
        <p className="flex items-center text-sm mb-2">
          <img src={dscvr_logo} alt="DSCVR Points Icon" className="w-8 mr-2" />
          {userData.dscvrPoints / 1e6}
        </p>
        <p className="text-sm text-gray-300">
          Wallet Address: <span className="cursor-pointer border-b border-dotted border-gray-300" title={walletAddress}>
            {shortenWalletAddress(walletAddress)}
          </span>
        </p>
      </div>
    </div>
  ) : (
    <div>No user data found</div>
  );
};

export default UserProfile;
