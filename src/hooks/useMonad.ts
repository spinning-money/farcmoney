import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi';
import { SpinAndWinMonadABI, MONAD_CONTRACT_ADDRESS } from '../contracts/SpinAndWinMonad';
import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';

export const useMonad = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Read contract data with refresh trigger
  const { data: prizePool, error: prizePoolError, refetch: refetchPrizePool } = useReadContract({
    address: MONAD_CONTRACT_ADDRESS,
    abi: SpinAndWinMonadABI,
    functionName: 'prizePool',
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });
  const { data: jackpotPool, error: jackpotPoolError, refetch: refetchJackpotPool } = useReadContract({
    address: MONAD_CONTRACT_ADDRESS,
    abi: SpinAndWinMonadABI,
    functionName: 'jackpotPool',
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });
  const { data: spinPrice, error: spinPriceError, refetch: refetchSpinPrice } = useReadContract({
    address: MONAD_CONTRACT_ADDRESS,
    abi: SpinAndWinMonadABI,
    functionName: 'SPIN_PRICE',
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });
  const { data: isPaused, error: isPausedError, refetch: refetchIsPaused } = useReadContract({
    address: MONAD_CONTRACT_ADDRESS,
    abi: SpinAndWinMonadABI,
    functionName: 'paused',
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });
  const { data: userData, error: userDataError, refetch: refetchUserData } = useReadContract({
    address: MONAD_CONTRACT_ADDRESS,
    abi: SpinAndWinMonadABI,
    functionName: 'users',
    args: [address!],
    query: {
      retry: 3,
      retryDelay: 1000,
    }
  });

  // Refresh function to update all contract data
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        refetchPrizePool(),
        refetchJackpotPool(),
        refetchSpinPrice(),
        refetchIsPaused(),
        refetchUserData()
      ]);
    } catch (error) {
      console.error('❌ Error refreshing Monad contract data:', error);
    }
  }, [refetchPrizePool, refetchJackpotPool, refetchSpinPrice, refetchIsPaused, refetchUserData]);

  // Write contract
  const { writeContractAsync } = useWriteContract();

  const spin = async () => {
    if (!address) return;
    setIsLoading(true);
    
    try {
      // Sabit spin price: 0.05 MON = 0.05 * 10^18 wei
      const fixedSpinPrice = BigInt("50000000000000000"); // 0.05 MON in wei
      
      // Check if we're in Farcaster environment and detect platform
      const isFarcaster = window.location.hostname.includes('farcaster') || 
                          window.location.hostname.includes('vercel') ||
                          navigator.userAgent.includes('Farcaster');
      
      // Detect Android platform
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      let result;
      
      if (isFarcaster && isAndroid) {
        // Use ultra-minimal parameters for Android Farcaster
        result = await writeContractAsync({
          address: MONAD_CONTRACT_ADDRESS,
          abi: SpinAndWinMonadABI,
          functionName: 'spin',
          value: fixedSpinPrice,
        });
      } else if (isFarcaster && isIOS) {
        // Use minimal parameters for iOS Farcaster
        result = await writeContractAsync({
          address: MONAD_CONTRACT_ADDRESS,
          abi: SpinAndWinMonadABI,
          functionName: 'spin',
          value: fixedSpinPrice,
        });
      } else if (isFarcaster) {
        // Use minimal parameters for Farcaster to avoid serialization issues
        result = await writeContractAsync({
          address: MONAD_CONTRACT_ADDRESS,
          abi: SpinAndWinMonadABI,
          functionName: 'spin',
          value: fixedSpinPrice,
        });
      } else {
        // Use full parameters for regular web
        result = await writeContractAsync({
          address: MONAD_CONTRACT_ADDRESS,
          abi: SpinAndWinMonadABI,
          functionName: 'spin',
          value: fixedSpinPrice,
        });
      }
      
      if (result) {
        console.log('✅ Monad spin transaction sent successfully:', result);
        // WebSocket will handle the result, no need for manual polling
      }
    } catch (error) {
      console.error('❌ Monad spin transaction failed:', error);
      
      // Special handling for Farcaster mini app errors
      if (error instanceof Error && (error.message.includes('serialize') || error.message.includes('postMessage') || error.message.includes('timeout'))) {
        console.log('🔄 Farcaster error detected, trying alternative approach...');
        
        // Detect platform for specific handling
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        try {
          if (isAndroid) {
            // Android-specific fallback - try without value first
            console.log('🔄 Trying Android-specific fallback...');
            const retryResult = await writeContractAsync({
              address: MONAD_CONTRACT_ADDRESS,
              abi: SpinAndWinMonadABI,
              functionName: 'spin',
            });
            
            console.log('✅ Android fallback successful:', retryResult);
            return retryResult;
          } else {
            // Try with even more minimal parameters for other platforms
            const retryResult = await writeContractAsync({
              address: MONAD_CONTRACT_ADDRESS,
              abi: SpinAndWinMonadABI,
              functionName: 'spin',
              value: BigInt("50000000000000000"), // 0.05 MON in wei
            });
            
            console.log('✅ Alternative approach successful:', retryResult);
            return retryResult;
          }
        } catch (retryError) {
          console.error('❌ Alternative approach also failed:', retryError);
          
          // Final fallback - try with just the basics
          try {
            console.log('🔄 Trying final fallback with basic parameters...');
            const fallbackResult = await writeContractAsync({
              address: MONAD_CONTRACT_ADDRESS,
              abi: SpinAndWinMonadABI,
              functionName: 'spin',
            });
            
            console.log('✅ Final fallback successful:', fallbackResult);
            return fallbackResult;
          } catch (finalError) {
            console.error('❌ All fallback attempts failed:', finalError);
            throw finalError;
          }
        }
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const claim = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const result = await writeContractAsync({
        address: MONAD_CONTRACT_ADDRESS,
        abi: SpinAndWinMonadABI,
        functionName: 'claim',
        account: address, // Explicitly set the account
        gas: BigInt(300000), // Set explicit gas limit
      });
      
      // Wait for transaction to be mined
      if (result) {
        console.log('✅ Monad claim transaction sent:', result);
      }
    } catch (error) {
      console.error('❌ Monad claim transaction failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Format userData for easier use
  const formattedUserData = userData && Array.isArray(userData) ? {
    spins: Number(userData[0]),
    claimable: userData[1] ? formatEther(userData[1] as bigint) : '0',
    claimed: userData[2] ? formatEther(userData[2] as bigint) : '0'
  } : null;

  return {
    address,
    isConnected,
    isLoading,
    prizePool: prizePool && typeof prizePool === 'bigint' ? formatEther(prizePool) : '0',
    jackpotPool: jackpotPool && typeof jackpotPool === 'bigint' ? formatEther(jackpotPool) : '0',
    spinPrice: '0.05', // Sabit spin price
    isPaused: isPaused || false,
    userData: formattedUserData,
    spin,
    claim,
    refreshData,
  };
}; 