import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { DiceGameABI, DICE_CONTRACT_ADDRESS } from '../contracts/DiceGame';

export const useDiceGame = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  // Read contract data
  const { data: userStats } = useReadContract({
    address: DICE_CONTRACT_ADDRESS,
    abi: DiceGameABI,
    functionName: 'userStats',
    args: [address!],
    enabled: !!address,
    watch: true
  });
  
  const { data: houseFees } = useReadContract({
    address: DICE_CONTRACT_ADDRESS,
    abi: DiceGameABI,
    functionName: 'houseFees',
    watch: true
  });

  // Note: New contract doesn't have claimableAmount function
  // Players receive winnings directly when they win
  
  const rollDice = async (gameType: number, betLevel: number) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    // Bet amounts for each level
    const betAmounts = [
      '0.00001', // Mini
      '0.00003', // Small
      '0.0001',  // Medium
      '0.0005',  // Large
      '0.001'    // Mega
    ];
    
    const betAmount = betAmounts[betLevel];
    const gameFee = '0.000015'; // New game fee
    const totalValue = parseEther((parseFloat(betAmount) + parseFloat(gameFee)).toString());
    
    console.log('🎲 Rolling dice with:', {
      gameType,
      betLevel,
      betAmount,
      gameFee,
      totalValue: totalValue.toString(),
      address: DICE_CONTRACT_ADDRESS
    });
    
    try {
      const result = await writeContractAsync({
        address: DICE_CONTRACT_ADDRESS,
        abi: DiceGameABI,
        functionName: 'rollDice',
        args: [gameType, betLevel],
        value: totalValue
      });
      
      console.log('✅ Dice roll transaction sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Dice roll failed:', error);
      throw error;
    }
  };

  // Note: New contract doesn't have claim function
  // Players receive winnings directly when they win
  
  // Format user stats for easier use
  const formattedUserStats = userStats ? {
    totalGames: Number(userStats[0]),
    totalWins: Number(userStats[1]),
    totalWagered: userStats[2] ? (Number(userStats[2]) / 1e18).toFixed(6) : '0',
    totalWon: userStats[3] ? (Number(userStats[3]) / 1e18).toFixed(6) : '0'
  } : null;
  
  return {
    address,
    isConnected,
    userStats: formattedUserStats,
    houseFees: houseFees ? (Number(houseFees) / 1e18).toFixed(6) : '0',
    rollDice
  };
};
