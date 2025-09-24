// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DiceGame is ReentrancyGuard, Pausable, Ownable {
    enum BetLevel { MINI, SMALL, MEDIUM, LARGE, MEGA }
    enum DiceGameType { LUCKY_7, HIGH_ROLLER, SNAKE_EYES, DOUBLE_OR_NOTHING }
    
    uint256 public constant MIN_BET = 0.00001 ether;
    uint256 public constant MAX_BET = 0.01 ether;
    uint256 public constant GAME_FEE = 0.000015 ether; // ✅ Her oyun için 0.000015 ETH fee
    uint16 public constant MAX_FEE_BP = 1_000; // 10%
    
    uint16 public houseFeeBP = 500; // 5% house fee
    uint256 public houseFees;
    
    // Bet seviyeleri
    mapping(BetLevel => uint256) public betAmounts;
    
    // Multiplier'lar
    mapping(DiceGameType => uint256) public multipliers;
    
    struct UserStats {
        uint256 totalGames;
        uint256 totalWins;
        uint256 totalWagered;
        uint256 totalWon;
    }
    
    mapping(address => UserStats) public userStats;
    
    event DiceRolled(
        address indexed player,
        DiceGameType gameType,
        BetLevel betLevel,
        uint8 die1,
        uint8 die2,
        uint8 total,
        bool won,
        uint256 payout
    );
    
    event FeesWithdrawn(uint256 amount);
    event GameFeeCollected(uint256 amount); // ✅ Yeni event
    event EmergencyWithdraw(uint256 amount); // ✅ Acil durum çekme event'i
    
    constructor() Ownable(msg.sender) {
        // Bet seviyeleri
        betAmounts[BetLevel.MINI] = 0.00001 ether;
        betAmounts[BetLevel.SMALL] = 0.00003 ether;
        betAmounts[BetLevel.MEDIUM] = 0.0001 ether;
        betAmounts[BetLevel.LARGE] = 0.0005 ether;
        betAmounts[BetLevel.MEGA] = 0.001 ether;
        
        // Multiplier'lar - %30-35 şans oranları için ayarlandı
        multipliers[DiceGameType.LUCKY_7] = 2;      // 30.56% * 2 = 61.12%
        multipliers[DiceGameType.HIGH_ROLLER] = 3;  // 25% * 3 = 75%
        multipliers[DiceGameType.SNAKE_EYES] = 4;   // 16.67% * 4 = 66.68%
        multipliers[DiceGameType.DOUBLE_OR_NOTHING] = 2; // 33.33% * 2 = 66.66%
    }
    
    function rollDice(DiceGameType gameType, BetLevel betLevel) external payable whenNotPaused nonReentrant {
        uint256 betAmount = betAmounts[betLevel];
        uint256 totalRequired = betAmount + GAME_FEE; // ✅ Bet + Game Fee
        
        require(msg.value >= totalRequired, "Insufficient payment (bet + fee)");
        require(msg.value <= totalRequired + 1e12, "Too much value sent");
        
        // ✅ Game fee direkt owner'a gönder
        (bool feeSuccess, ) = owner().call{value: GAME_FEE}("");
        require(feeSuccess, "Game fee transfer failed");
        emit GameFeeCollected(GAME_FEE);
        
        // Calculate house fee from bet amount
        uint256 fee = (betAmount * houseFeeBP) / 10_000;
        houseFees += fee;
        
        // Refund excess
        if (msg.value > totalRequired) {
            (bool ok, ) = msg.sender.call{value: msg.value - totalRequired}("");
            require(ok, "Refund failed");
        }
        
        // Generate random dice
        (uint8 die1, uint8 die2) = _generateDice();
        uint8 total = die1 + die2;
        
        // Check win condition
        bool won = _checkWinCondition(gameType, die1, die2, total);
        uint256 payout = 0;
        
        if (won) {
            payout = betAmount * multipliers[gameType];
            require(address(this).balance >= payout, "Insufficient contract balance");
            (bool success, ) = msg.sender.call{value: payout}("");
            require(success, "Payout failed");
        }
        
        // Update user stats
        userStats[msg.sender].totalGames++;
        userStats[msg.sender].totalWagered += betAmount;
        if (won) {
            userStats[msg.sender].totalWins++;
            userStats[msg.sender].totalWon += payout;
        }
        
        emit DiceRolled(msg.sender, gameType, betLevel, die1, die2, total, won, payout);
    }
    
    function _generateDice() private view returns (uint8 die1, uint8 die2) {
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,  // ✅ block.difficulty yerine block.prevrandao
            msg.sender,
            block.number,
            gasleft()
        )));
        
        // ✅ Daha iyi randomness için farklı bit pozisyonları kullan
        die1 = uint8((random % 6) + 1);
        die2 = uint8(((random >> 16) % 6) + 1);  // 16 bit kaydırma daha iyi
        
        // ✅ Ek güvenlik: Eğer aynı değerler gelirse tekrar hesapla
        if (die1 == die2) {
            die2 = uint8(((random >> 32) % 6) + 1);
        }
    }
    
    function _checkWinCondition(DiceGameType gameType, uint8 /* die1 */, uint8 /* die2 */, uint8 total) private pure returns (bool) {
        if (gameType == DiceGameType.LUCKY_7) {
            return total == 7 || total == 8;  // ✅ 7, 8 (30.56% şans)
        } else if (gameType == DiceGameType.HIGH_ROLLER) {
            return total == 9 || total == 10 || total == 11;  // ✅ 9, 10, 11 (25% şans)
        } else if (gameType == DiceGameType.SNAKE_EYES) {
            return total == 2 || total == 3 || total == 4;  // ✅ 2, 3, 4 (16.67% şans)
        } else if (gameType == DiceGameType.DOUBLE_OR_NOTHING) {
            return total == 5 || total == 6 || total == 7;  // ✅ 5, 6, 7 (33.33% şans)
        }
        return false;
    }
    
    // Admin functions
    function setHouseFee(uint16 newFeeBP) external onlyOwner {
        require(newFeeBP <= MAX_FEE_BP, "Fee too high");
        houseFeeBP = newFeeBP;
    }
    
    function withdrawFees(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= houseFees, "Exceeds fees");
        houseFees -= amount;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdrawal failed");
        emit FeesWithdrawn(amount);
    }
    
    // ✅ ACİL DURUM ÇEKME FONKSİYONU - GÜVENLİK AMAÇLI
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");
        
        // Tüm kontrat bakiyesini owner'a gönder
        (bool success, ) = owner().call{value: contractBalance}("");
        require(success, "Emergency withdrawal failed");
        
        // House fees'i sıfırla (çünkü tüm para çekildi)
        houseFees = 0;
        
        emit EmergencyWithdraw(contractBalance);
    }
    
    // ✅ KONTrat BAKİYESİNİ GÖRME FONKSİYONU
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    receive() external payable {}
}
