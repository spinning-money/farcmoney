# Monad Contract Verification Information

## Contract Details
- **Contract Address**: `0x1c7a5b4591cb938302f754f4398e584759830d9a`
- **Network**: Monad Testnet
- **Explorer**: https://explorer.testnet.monad.xyz/address/0x1c7a5b4591cb938302f754f4398e584759830d9a

## Verification Steps

### 1. Monad Explorer'da Verify
1. https://explorer.testnet.monad.xyz/address/0x1c7a5b4591cb938302f754f4398e584759830d9a adresine git
2. "Contract" tab'ına tıkla
3. "Verify and Publish" butonuna tıkla

### 2. Verification Settings
- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: v0.8.19
- **Optimization**: Enabled
- **Optimization Runs**: 200
- **EVM Version**: paris
- **License Type**: MIT License (MIT)

### 3. Contract Source Code
Flattened contract code: `SpinAndWinMonad_flattened.sol` dosyasını kullan

### 4. Constructor Arguments
- **Constructor Arguments**: Boş (constructor parametresi yok)

### 5. Contract Features
- **Spin Price**: 0.05 MON
- **Spin Fee**: 5% (500 basis points)
- **Claim Fee**: 2% (200 basis points)
- **Jackpot Share**: 20% (2000 basis points)
- **Max Jackpot**: 100 MON
- **Prizes**: 10 MON, 5 MON, 2 MON, 1 MON, 0.5 MON, 0.2 MON, Try Again

### 6. Security Features
- **ReentrancyGuard**: ✅
- **Pausable**: ✅
- **Ownable**: ✅
- **Safe Transfers**: ✅
- **Input Validation**: ✅

### 7. Events
- `SpinResult(address indexed player, uint256 reward, uint256 jpReward, uint8 prizeIndex)`
- `Claimed(address indexed player, uint256 net, uint256 fee)`
- `FeesWithdrawn(uint256 amount)`
- `PoolWithdrawn(uint256 amount)`
- `JackpotWithdrawn(uint256 amount)`
- `FeesUpdated(uint16 spinBP, uint16 claimBP)`
- `JackpotShareUpdated(uint16 shareBP)`
- `PoolsShifted(string direction, uint256 amount)`

### 8. Admin Functions
- `setFees(uint16 newSpinBP, uint16 newClaimBP)`
- `setJackpotShare(uint16 newShareBP)`
- `pause()`
- `unpause()`
- `withdrawFees(uint256 amt)`
- `withdrawAllFees()`
- `withdrawPool(uint256 amt)`
- `withdrawAllPool()`
- `withdrawJackpot(uint256 amt)`
- `withdrawAllJackpot()`
- `shiftJackpotToPool(uint256 amount)`
- `shiftPoolToJackpot(uint256 amount)`
- `emergencyJackpotWithdraw(uint256 amount)`

### 9. User Functions
- `spin()` - payable
- `claim()`

### 10. View Functions
- `prizePool()` - returns uint256
- `jackpotPool()` - returns uint256
- `ownerFees()` - returns uint256
- `spinFeeBP()` - returns uint16
- `claimFeeBP()` - returns uint16
- `jackpotShareBP()` - returns uint16
- `users(address)` - returns (uint256 spins, uint256 claimable, uint256 claimed)
- `paused()` - returns bool
- `owner()` - returns address

## Verification Notes
- Contract uses OpenZeppelin v5.0.0 contracts
- All dependencies are flattened into single file
- No constructor arguments needed
- Contract is ready for verification 