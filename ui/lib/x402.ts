"use client"
import { wrapFetchWithPayment } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function x402CreateAvatarCall(url: string, templateId: number, address: string, creator: string) {
  const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
  });

  const wallet = createWallet("io.metamask"); // or any other wallet
  await wallet.connect({ client });

  // Wrap fetch with payment handling
  const fetchWithPay = wrapFetchWithPayment(fetch, client, wallet);

  // Make a request that may require payment
  const response = await fetchWithPay(
    `${url}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateId,
        userAddress: address,
        creator
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.json();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}


export async function x402UpdateAvatarCall(url: string, avatarId: number, action: string, address: string, creator: string) {
  const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!
  });

  const wallet = createWallet("io.metamask");
  await wallet.connect({ client });

  // Wrap fetch with payment handling
  const fetchWithPay = wrapFetchWithPayment(fetch, client, wallet);

  // Make a request that may require payment
  const response = await fetchWithPay(
    `${url}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        avatarId,
        action,
        userAddress: address,
        creator,
      }),
    },
  );

  // Check if response is ok before parsing
  if (!response.ok) {
    const errorText = await response.json();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
